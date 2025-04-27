from django.db import models
from django.contrib.auth.models import AbstractUser

# Custom User model with roles
class User(AbstractUser):
    is_buyer = models.BooleanField(default=False)
    is_supplier = models.BooleanField(default=False)
    address = models.TextField(blank=True, null=True)
 

# Order model to track orders
class Order(models.Model):
    # Order for a buyer
    buyer = models.ForeignKey(User, related_name='orders', on_delete=models.CASCADE)
    supplier = models.ForeignKey(User, related_name='supplied_orders', on_delete=models.SET_NULL, null=True, blank=True)
    total_price = models.FloatField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('confirmed', 'Confirmed'),
            ('rejected', 'Rejected'),
            ('hold', 'On Hold'),
            ('past', 'Past')
        ],
        default='pending'
    )
    note = models.TextField(blank=True, null=True)
    delivery_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} for {self.buyer.username}"

    # Custom method to calculate total price from items
    def calculate_total_price(self):
        total = sum(item.supplier_price * item.quantity for item in self.items.all())
        self.total_price = total
        self.save()


# Each item in the order
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    item_name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    buyer_price = models.FloatField(null=True, blank=True)  # Price from the supplier
    allergy_info = models.CharField(max_length=255, null=True, blank=True)  # Added allergy info field

    def __str__(self):
        return f"{self.quantity} of {self.item_name} in Order #{self.order.id}"

# Supplier orders model that send from buyers
class SentOrderItem(models.Model):
    supplier = models.ForeignKey(User, on_delete=models.CASCADE)
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE)
    buyer = models.ForeignKey(User, related_name="sent_orders", on_delete=models.CASCADE)  # Added ForeignKey for the buyer
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Item '{self.order_item.item_name}' sent to {self.supplier.username} by {self.buyer.username}"


# Offer model for suppliers to submit offers
class Offer(models.Model):
   
    order = models.ForeignKey(Order, related_name='offers', on_delete=models.CASCADE)
    supplier = models.ForeignKey(User, related_name='offers_by_supplier', on_delete=models.CASCADE)
    buyer = models.ForeignKey(User, related_name="offers_get_by_buyer", on_delete=models.CASCADE)  # Added ForeignKey for the buyer
    price = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_delivery_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ('available', 'Available'),
            ('unavailable', 'Unavailable')
        ],
        default='available'
    )

    def __str__(self):
        return f"Offer {self.id} by {self.supplier.username}"

    # Custom method to choose the lowest offer for an order
    @classmethod
    def get_lowest_offer(cls, order):
        # Get all available offers for the order
        available_offers = cls.objects.filter(order=order, status='available')
        lowest_offer = available_offers.order_by('price').first()  # Get the lowest price
        return lowest_offer

# ItemOffer model for item-level offers from suppliers
class ItemOffer(models.Model):
    order_item = models.ForeignKey(OrderItem, related_name='item_offers', on_delete=models.CASCADE)
    supplier = models.ForeignKey(User, related_name='item_offers', on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ('available', 'Available'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
            ('updated', 'Updated'),
        ],
        default='available'
    )

    def __str__(self):
        return f"Item Offer for {self.order_item.item_name} by {self.supplier.username}"

# Notification model for user notifications
class Notification(models.Model):
    # The user who should receive this notification
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    # Type of notification
    type = models.CharField(
        max_length=50,
        choices=[
            ('new_bid', 'New Bid'),
            ('bid_accepted', 'Bid Accepted'),
            ('order_status_change', 'Order Status Change'),
            ('generic', 'Generic Notification')
        ]
    )
    
    # Message content (used for generic notifications)
    message = models.TextField(blank=True, null=True)
    
    # Related objects IDs
    order_id = models.IntegerField(null=True, blank=True)
    supplier_id = models.IntegerField(null=True, blank=True)
    buyer_id = models.IntegerField(null=True, blank=True)
    
    # Additional data as JSON (price, supplier name, etc.)
    data = models.JSONField(default=dict, blank=True)
    
    # Read status
    read = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Notification {self.id} for {self.user.username} - {self.type}"
