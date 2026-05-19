import mimetypes
from email.message import MIMEPart

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string


class InlineEmailMessage(EmailMessage):
    def _add_attachments(self, msg):
        if self.attachments:
            msg.make_related()
            for attachment in self.attachments:
                msg.attach(attachment)


class EmailSender:
    def __init__(
        self,
        from_email: str | None = None,
    ):
        self.from_email = from_email or settings.DEFAULT_FROM_EMAIL

    @classmethod
    def from_env(cls):
        """
        Cria o sender usando as configuracoes padrao de e-mail do Django.
        """

        return cls()

    def render_template(
        self,
        template_name: str,
        context: dict
    ) -> str:
        """
        Renderiza template HTML do Django.
        """

        return render_to_string(
            template_name,
            context
        )

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
        inline_images: list[dict] | None = None,
        connection=None,
    ) -> bool:

        try:
            email = InlineEmailMessage(
                subject=subject,
                body=html_body,
                from_email=self.from_email,
                to=[to_email],
                connection=connection,
            )
            email.content_subtype = "html"
            for image in inline_images or []:
                self._attach_inline_image(email, image["path"], image["cid"])
            enviados = email.send(fail_silently=False)

            return enviados == 1

        except Exception as e:
            print(f"Erro ao enviar e-mail: {e}")
            return False

    def _attach_inline_image(self, email, image_path: str, cid: str):
        mime_type, _ = mimetypes.guess_type(image_path)
        maintype, subtype = (mime_type or "image/png").split("/", 1)

        with open(image_path, "rb") as image_file:
            image = MIMEPart()
            image.set_content(
                image_file.read(),
                maintype=maintype,
                subtype=subtype,
                disposition="inline",
                cid=f"<{cid}>",
                filename=cid,
            )

        email.attach(image)
