"""Testes de regressão do ATMOS no Chrome."""
import argparse
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from queue import Empty, Queue
import re
import subprocess
from tempfile import TemporaryDirectory
from threading import Thread

RAIZ = Path(__file__).resolve().parents[1]
SUBDIRETORIO = "/ATMOS-Weather"


class Servidor(SimpleHTTPRequestHandler):
    def log_message(self, formato, *args):
        pass

    def translate_path(self, caminho):
        return super().translate_path(caminho.removeprefix(SUBDIRETORIO))

    def copyfile(self, origem, destino):
        try:
            super().copyfile(origem, destino)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            # O navegador pode cancelar requisições paralelas ao recusar um pré-cache.
            pass

    def do_GET(self):
        if not self.path.startswith(SUBDIRETORIO + "/"):
            return self.send_error(404)
        caminho = self.path.split("?", 1)[0].removeprefix(SUBDIRETORIO)
        if self.server.sem_rede or (self.server.estrutura_incompleta and caminho == "/offline-forecast.js"):
            return self.send_error(503)
        if not self.server.servicos_reais and caminho == "/service-worker.js":
            codigo = (RAIZ / "service-worker.js").read_text(encoding="utf-8")
            if self.server.nova_versao:
                codigo = re.sub(r'const SHELL_VERSION = "([^"]+)";', r'const SHELL_VERSION = "\1-teste";', codigo, count=1)
            if self.server.versao_repetida:
                codigo += "\n// Simula publicação sem alteração do número da versão.\n"
            return self.enviar_arquivo_de_teste(codigo, "text/javascript")
        if caminho not in ("/simulacao", "/index.html") or (caminho == "/index.html" and self.server.servicos_reais):
            return super().do_GET()
        pagina = (RAIZ / "index.html").read_text(encoding="utf-8")
        if caminho == "/index.html":
            simulacao = (RAIZ / "tests" / "simulacao.js").read_text(encoding="utf-8")
            versao = 2 if self.server.nova_versao else 1
            pagina = pagina.replace("<head>", f'<head data-versao-teste="{versao}"><script>{simulacao}</script>', 1)
        else:
            pagina = pagina.replace("<head>", '<head><script src="./tests/simulacao.js"></script>', 1)
        pagina = "\n".join(linha for linha in pagina.splitlines() if "fonts.googleapis" not in linha
                           and "fonts.gstatic" not in linha)
        return self.enviar_arquivo_de_teste(pagina, "text/html")

    def enviar_arquivo_de_teste(self, conteudo, tipo):
        dados = conteudo.encode()
        self.send_response(200)
        self.send_header("Content-Type", f"{tipo}; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def do_POST(self):
        if self.path == SUBDIRETORIO + "/controle-pwa" and not self.server.servicos_reais:
            estado = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            self.server.sem_rede = estado.get("sem_rede") is True
            self.server.nova_versao = estado.get("nova_versao") is True
            self.server.versao_repetida = estado.get("versao_repetida") is True
            self.server.estrutura_incompleta = estado.get("estrutura_incompleta") is True
            self.send_response(204)
            self.end_headers()
            return
        if self.path != SUBDIRETORIO + "/resultado":
            return self.send_error(404)
        dados = self.rfile.read(int(self.headers["Content-Length"])).decode()
        self.server.resultados.put(dados)
        self.send_response(204)
        self.end_headers()


def executar(servicos_reais):
    navegador = os.environ.get("ATMOS_CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(Servidor, directory=RAIZ)) as servidor:
        servidor.resultados = Queue()
        servidor.servicos_reais = servicos_reais
        servidor.sem_rede = False
        servidor.nova_versao = False
        servidor.versao_repetida = False
        servidor.estrutura_incompleta = False
        Thread(target=servidor.serve_forever).start()
        try:
            with TemporaryDirectory(prefix="atmos-navegador-", ignore_cleanup_errors=True) as perfil:
                endereco = f"http://127.0.0.1:{servidor.server_port}{SUBDIRETORIO}/tests/configuracoes.html"
                if servicos_reais:
                    endereco += "?servicos-reais"
                with subprocess.Popen(
                    [navegador, "--headless", f"--user-data-dir={perfil}", "--disable-gpu",
                     "--disable-background-networking", "--no-first-run", "--window-size=1440,900",
                     f"--log-file={Path(perfil) / 'chrome.log'}", endereco],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                ) as processo:
                    try:
                        resultado = servidor.resultados.get(timeout=65)
                    except Empty:
                        raise SystemExit("O navegador não enviou o resultado dos testes.") from None
                    finally:
                        processo.terminate()
                if not resultado.startswith("Aprovado."):
                    raise SystemExit(resultado)
                print(resultado)
        finally:
            servidor.shutdown()


if __name__ == "__main__":
    argumentos = argparse.ArgumentParser(description=__doc__)
    argumentos.add_argument("--servicos-reais", action="store_true",
                            help="Consulta a Open-Meteo e carrega o mapa do Leaflet.")
    executar(argumentos.parse_args().servicos_reais)
