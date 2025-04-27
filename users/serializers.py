from rest_framework import serializers
from .models import Order, OrderItem,Offer
from django.contrib.auth.models import User

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['name', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ['user', 'total_price', 'status', 'items']

class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = [
            'id',
            'order',
            'supplier',
            'buyer',
            'price',
            'estimated_delivery_time',
            'status'
        ] # list only the fields you want to include
