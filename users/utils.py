import threading
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
import logging

class EmailThread(threading.Thread):
    """
    Thread class for sending emails in the background
    """
    def __init__(self, email):
        self.email = email
        threading.Thread.__init__(self)

    def run(self):
        try:
            self.email.send(fail_silently=False)
        except Exception as e:
            # Log the error but don't crash the thread
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send email: {str(e)}")

def send_notification_email(subject, recipient_email, context, template='emails/notification.html'):
    """
    Send an email notification in a background thread
    
    Args:
        subject (str): Email subject
        recipient_email (str): Recipient's email address
        context (dict): Context data for the email content
        template (str, optional): Path to HTML template. If None, plain text will be used.
    """
    # Add subject to context for template
    context['subject'] = subject
    
    if template:
        content = render_to_string(template, context)
        email = EmailMessage(
            subject=subject,
            body=content,
            from_email=settings.EMAIL_HOST_USER,
            to=[recipient_email],
        )
        email.content_subtype = "html"
    else:
        # Plain text email if no template is provided
        content = context.get('message', '')
        email = EmailMessage(
            subject=subject,
            body=content,
            from_email=settings.EMAIL_HOST_USER,
            to=[recipient_email],
        )

    # Send the email in a background thread
    EmailThread(email).start()

def send_order_confirmation_email(order, buyer_email, supplier_email=None, best_offer_price=None):
    """
    Send order confirmation emails to buyer and supplier
    
    Args:
        order: The Order object
        buyer_email (str): Buyer's email address
        supplier_email (str, optional): Supplier's email address
        best_offer_price (float, optional): The accepted bid price
    """
    # Send email to buyer
    buyer_subject = f"Order #{order.id} Confirmation"
    buyer_context = {
        'message': f"Your order #{order.id} has been confirmed with {order.supplier.username}.\n"
                  f"Total price: £{best_offer_price if best_offer_price is not None else order.total_price}\n"
                  f"Status: {order.status}"
    }
    send_notification_email(buyer_subject, buyer_email, buyer_context)
    
    # Send email to supplier if available
    if supplier_email:
        supplier_subject = f"New Order #{order.id} Confirmation"
        supplier_context = {
            'message': f"Order #{order.id} from {order.buyer.username} has been confirmed.\n"
                      f"Total price: £{best_offer_price if best_offer_price is not None else order.total_price}\n"
                      f"Status: {order.status}"
        }
        send_notification_email(supplier_subject, supplier_email, supplier_context)

def send_offer_notification_email(order, supplier, buyer_email, price):
    """
    Send notification about a new offer to the buyer
    
    Args:
        order: The Order object
        supplier: The Supplier user object
        buyer_email (str): Buyer's email address
        price (float): Offer price
    """
    subject = f"New Offer for Order #{order.id}"
    context = {
        'message': f"Supplier {supplier.username} has placed a new offer of £{price} for your order #{order.id}."
    }
    send_notification_email(subject, buyer_email, context)

def send_status_update_email(order, user_email):
    """
    Send notification about order status changes
    
    Args:
        order: The Order object
        user_email (str): Email of the user to notify
    """
    subject = f"Order #{order.id} Status Update"
    context = {
        'message': f"Order #{order.id} status has been updated to: {order.status}"
    }
    send_notification_email(subject, user_email, context) 