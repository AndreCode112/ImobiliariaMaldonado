from concurrent.futures import ThreadPoolExecutor

from django.db import close_old_connections

from .models import Imovel


_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="imoveis-bg")


def enqueue_pontos_interesse_sync(imovel_id, *, force=False):
    _executor.submit(_sync_pontos_interesse_for_imovel, imovel_id, force)


def _sync_pontos_interesse_for_imovel(imovel_id, force):
    close_old_connections()
    try:
        from .Controller.sync_pontos_interesse import sync_pontos_interesse_imovel

        imovel = Imovel.objects.select_related("cidade").get(pk=imovel_id)
        sync_pontos_interesse_imovel(imovel, force=force)
    except Exception:
        pass
    finally:
        close_old_connections()
