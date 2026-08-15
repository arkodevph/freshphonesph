"""notify-on-verify (M10 hook fired by payments verify)."""
from datetime import date

from django.core import mail
from django.test import TestCase

from notifications_app.models import Notification
from payments_app import services
from payments_app.models import Payment
from payments_app.tests.factories import make_client_with_schedule, make_employee


class NotifyOnVerifyTests(TestCase):
    def _pending(self, member, emp):
        return services.record_payment(
            client=member, batch=member.batch, amount="2000.00",
            payment_date=date.today(), method="gcash", recorded_by=emp,
        )

    def test_verify_creates_in_app_notification(self):
        member = make_client_with_schedule()
        emp = make_employee()
        p = self._pending(member, emp)
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp)
        notifs = Notification.objects.filter(client=member, payment=p)
        self.assertEqual(notifs.count(), 1)
        self.assertEqual(notifs.first().title, "Payment verified")

    def test_verify_emails_customer_when_contact_email_set(self):
        member = make_client_with_schedule()
        member.contact_email = "maria@example.com"
        member.save()
        emp = make_employee()
        p = self._pending(member, emp)
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("maria@example.com", mail.outbox[0].to)

    def test_no_email_without_contact_email(self):
        member = make_client_with_schedule()  # no contact_email
        emp = make_employee()
        p = self._pending(member, emp)
        services.verify_payment(payment_id=p.id, decision=Payment.Status.VERIFIED, actor=emp)
        self.assertEqual(len(mail.outbox), 0)

    def test_rejected_does_not_notify(self):
        member = make_client_with_schedule()
        emp = make_employee()
        p = self._pending(member, emp)
        services.verify_payment(payment_id=p.id, decision=Payment.Status.REJECTED, actor=emp)
        self.assertEqual(Notification.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)
