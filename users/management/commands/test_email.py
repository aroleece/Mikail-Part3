from django.core.management.base import BaseCommand
from django.conf import settings
from users.utils import send_notification_email
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test email sending functionality'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Email address to send test to')

    def handle(self, *args, **kwargs):
        recipient_email = kwargs['email']
        
        try:
            self.stdout.write(self.style.WARNING(f'Attempting to send a test email to {recipient_email}...'))
            
            subject = 'Test Email from Mikail Platform'
            context = {
                'message': 'This is a test email to verify the email notification system is working correctly.\n'
                           'If you received this email, it means your email configuration is working!'
            }
            
            send_notification_email(subject, recipient_email, context)
            
            self.stdout.write(self.style.SUCCESS(
                f'Test email sent to {recipient_email}. Check your inbox (and spam folder).'
            ))
            self.stdout.write(self.style.WARNING(
                'Note: This is sent asynchronously, so it might take a moment to arrive.'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send test email: {str(e)}'))
            logger.error(f'Test email error: {str(e)}') 