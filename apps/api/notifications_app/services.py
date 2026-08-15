"""Notification services (M10).

`notify_payment_verified` is the hook fired by payments_app.verify_payment when
Finance verifies a payment: it records an in-app notification and best-effort
emails the customer (MailHog locally, Resend SMTP in prod).
"""
from django.conf import settings
from django.core.mail import send_mail

from .models import Notification


def notify_payment_verified(payment) -> Notification:
    client = payment.client
    title = "Payment verified"
    body = (
        f"Your payment of PHP {payment.amount} (ref {payment.reference_no or 'n/a'}) "
        f"has been verified by Fresh Phones PH. Check your portal for the updated balance."
    )
    notif = Notification.objects.create(
        client=client,
        channel=Notification.Channel.IN_APP,
        title=title,
        body=body,
        payment=payment,
    )
    # Best-effort email — never let a mail failure roll back the verification.
    if client and client.contact_email:
        send_mail(
            subject=f"{title} — Fresh Phones PH",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[client.contact_email],
            fail_silently=True,
        )
    return notif
