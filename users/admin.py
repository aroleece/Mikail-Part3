from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import User, Order, OrderItem, SentOrderItem, Offer, ItemOffer, Notification

class CustomUserAdmin(UserAdmin):
    list_display = UserAdmin.list_display + ('is_buyer', 'is_supplier')
    fieldsets = UserAdmin.fieldsets + (
        ('User Type', {'fields': ('is_buyer', 'is_supplier', 'address')}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(SentOrderItem)
admin.site.register(Offer)
admin.site.register(ItemOffer)
admin.site.register(Notification)


