import os
import shlex
import subprocess
import sys

from django.conf import settings
from django.utils import timezone


CRON_START = "# MALDONADO_LEMBRETE_FAVORITOS_START"
CRON_END = "# MALDONADO_LEMBRETE_FAVORITOS_END"


def cron_available() -> bool:
    return sys.platform.startswith("linux")


def build_cron_line(config) -> str:
    minute = config.horario.minute
    hour = config.horario.hour
    python_bin = shlex.quote(sys.executable)
    manage_py = shlex.quote(str(settings.BASE_DIR / "manage.py"))
    project_dir = shlex.quote(str(settings.BASE_DIR))
    log_file = shlex.quote(str(settings.BASE_DIR / "logs" / "lembrete_favoritos.log"))
    return f"{minute} {hour} * * * cd {project_dir} && {python_bin} {manage_py} enviar_lembrete_favoritos >> {log_file} 2>&1"


def sync_crontab(config) -> tuple[bool, str]:
    if not cron_available():
        config.cron_instalado = False
        config.cron_linha = ""
        config.ultima_atualizacao_cron = timezone.now()
        config.save(update_fields=["cron_instalado", "cron_linha", "ultima_atualizacao_cron", "atualizado_em"])
        return False, "Agendamento via cron disponivel apenas em Linux."

    os.makedirs(settings.BASE_DIR / "logs", exist_ok=True)
    current = _read_crontab()
    cleaned = _remove_managed_block(current)

    if config.ativo:
        cron_line = build_cron_line(config)
        next_crontab = cleaned.rstrip()
        if next_crontab:
            next_crontab += "\n"
        next_crontab += f"{CRON_START}\n{cron_line}\n{CRON_END}\n"
        _write_crontab(next_crontab)
        config.cron_instalado = True
        config.cron_linha = cron_line
        message = "Cron instalado/atualizado com sucesso."
    else:
        _write_crontab(cleaned)
        config.cron_instalado = False
        config.cron_linha = ""
        message = "Cron removido porque o agendamento esta inativo."

    config.ultima_atualizacao_cron = timezone.now()
    config.save(update_fields=["cron_instalado", "cron_linha", "ultima_atualizacao_cron", "atualizado_em"])
    return True, message


def _read_crontab() -> str:
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        return ""
    return result.stdout


def _write_crontab(content: str) -> None:
    subprocess.run(["crontab", "-"], input=content, text=True, check=True)


def _remove_managed_block(content: str) -> str:
    lines = content.splitlines()
    cleaned = []
    inside = False

    for line in lines:
        if line.strip() == CRON_START:
            inside = True
            continue
        if line.strip() == CRON_END:
            inside = False
            continue
        if not inside:
            cleaned.append(line)

    return "\n".join(cleaned).strip() + ("\n" if cleaned else "")
