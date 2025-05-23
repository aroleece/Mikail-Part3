# Generated by Django 4.2.3 on 2025-04-25 18:37

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0008_offeritem"),
    ]

    operations = [
        migrations.CreateModel(
            name="ItemOffer",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("notes", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("available", "Available"),
                            ("accepted", "Accepted"),
                            ("rejected", "Rejected"),
                            ("updated", "Updated"),
                        ],
                        default="available",
                        max_length=50,
                    ),
                ),
            ],
        ),
        migrations.RemoveField(
            model_name="offer",
            name="created_at",
        ),
        migrations.AddField(
            model_name="notification",
            name="order_item_id",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="accepted_supplier",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="supplied_items",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="supplier_price",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("new_bid", "New Bid"),
                    ("bid_accepted", "Bid Accepted"),
                    ("order_status_change", "Order Status Change"),
                    ("generic", "Generic Notification"),
                    ("new_item_offer", "New Item Offer"),
                    ("item_offer_updated", "Item Offer Updated"),
                    ("item_offer_accepted", "Item Offer Accepted"),
                ],
                max_length=50,
            ),
        ),
        migrations.DeleteModel(
            name="OfferItem",
        ),
        migrations.AddField(
            model_name="itemoffer",
            name="order_item",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="item_offers",
                to="users.orderitem",
            ),
        ),
        migrations.AddField(
            model_name="itemoffer",
            name="supplier",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="item_offers",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
