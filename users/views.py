from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from users.utils import send_notification_email
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from .models import Order, OrderItem, Offer, SentOrderItem, Notification, ItemOffer
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.tokens import RefreshToken
from collections import defaultdict
from django.db.models import Q
User = get_user_model()

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        role = request.data.get('role')  # 'buyer' or 'supplier'

        if User.objects.filter(username=username).exists():
            raise ValidationError({"username": "This username is already taken."})

        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            if role == 'buyer':
                user.is_buyer = True
            elif role == 'supplier':
                user.is_supplier = True
            user.save()

            # Return user details in response
            return Response({
                "message": "User created successfully",
                "user": {
                    "username": user.username,
                    "email": user.email,
                    "role": role,
                    
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username_or_email = request.data.get('username')
        password = request.data.get('password')

        user = User.objects.filter(
            Q(username=username_or_email) | Q(email=username_or_email)
        ).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': 'buyer' if getattr(user, 'is_buyer', False) else 'supplier' if getattr(user, 'is_supplier', False) else 'unknown',
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_200_OK)

        return Response({
            'message': 'Invalid username or password'
        }, status=status.HTTP_401_UNAUTHORIZED)



# log out functionality
class LogOutAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        # Do nothing on server, just confirm logout
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
    # def post(self, request):
    #     refresh_token = request.data.get("refresh")
    #
    #     if not refresh_token:
    #         return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
    #
    #     try:
    #         token = RefreshToken(refresh_token)
    #         token.blacklist()
    #         return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
    #     except Exception as e:
    #         return Response({"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

class APIRootView(APIView):
    def get(self, request):
        # Return a simple message or list of available endpoints
        return Response({
            "message": "Welcome to the Mikail Platform API",
            "endpoints": {
                "register": "/api/register/",
                "login": "/api/login/",
            }
        })
    

class CreateOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        buyer = request.user
        items = request.data.get('items')
        total_price = request.data.get('total_price')
        print(buyer.email,buyer.password,items,total_price)
        if not items:
            return Response({'error': 'Items are required.'}, status=400)

        # Create order
        order = Order.objects.create(
            buyer=buyer,
            total_price=total_price,
            status='pending'
        )
        print(order)
        # # Create order items
        for item in items:
            OrderItem.objects.create(
            order=order,
            item_name=item.get('name'),              # ✅ use item_name instead of name
            quantity=item.get('quantity'),
            buyer_price=item.get('price'),        # ✅ use supplier_price instead of price
            allergy_info=item.get('allergy_info')  # Save allergy information
        )

        print('OrderItems: ',OrderItem.objects.all().values())
        return Response({"message": "Order created successfully", "order_id": order.id}, status=status.HTTP_201_CREATED)

    def get(self, request):
        buyer = request.user
        status_filter = request.query_params.get('status')

        # Ensure users can only see their own orders
        orders = Order.objects.filter(buyer=buyer)
        if status_filter:
            orders = orders.filter(status=status_filter)

        # Order by newest first (descending order_id)
        orders = orders.order_by('-id')
        
        # No limit - return all orders
        orders = orders.prefetch_related('items')

        order_list = []
        for order in orders:
            # Get all offers/bids for this order (only active ones)
            all_offers = Offer.objects.filter(order=order, status='available').order_by('price')
            offers_data = []
            
            for offer in all_offers:
                # Safely format offer created_at
                offer_created_at = None
                if hasattr(offer, 'created_at') and offer.created_at:
                    try:
                        offer_created_at = str(offer.created_at)
                    except Exception:
                        offer_created_at = str(offer.created_at)
                        
                # Get item-level bid prices for this offer's supplier
                item_offers = {}
                for item in order.items.all():
                    item_offer = ItemOffer.objects.filter(
                        order_item=item,
                        supplier=offer.supplier
                    ).order_by('-created_at').first()
                    
                    if item_offer:
                        item_offers[item.id] = float(item_offer.price)
                
                offers_data.append({
                    'supplier_id': offer.supplier.id,
                    'supplier_username': offer.supplier.username,
                    'price': float(offer.price),
                    'created_at': offer_created_at,
                    'item_prices': item_offers
                })
            
            # Find lowest bid for this order
            lowest_offer = all_offers.first()
            lowest_bid_info = None
            
            if lowest_offer:
                # Get item-level bid prices for lowest bidder
                lowest_item_prices = {}
                for item in order.items.all():
                    item_offer = ItemOffer.objects.filter(
                        order_item=item,
                        supplier=lowest_offer.supplier
                    ).order_by('-created_at').first()
                    
                    if item_offer:
                        lowest_item_prices[item.id] = float(item_offer.price)
                
                lowest_bid_info = {
                    'amount': float(lowest_offer.price),
                    'supplier_id': lowest_offer.supplier.id,
                    'supplier_username': lowest_offer.supplier.username,
                    'item_prices': lowest_item_prices
                }
            
            # Safely format delivery_date
            delivery_date_value = None
            if order.delivery_date:
                try:
                    delivery_date_value = str(order.delivery_date)
                except Exception:
                    delivery_date_value = str(order.delivery_date)
            
            order_data = {
                'order_id': order.id,
                'total_price': order.total_price,
                'buyer_original_price': order.total_price,  # Original price set by buyer
                'status': order.status,
                'delivery_date': delivery_date_value,
                'note': order.note or '',
                'supplier': {'username': order.supplier.username, 'id': order.supplier.id} if order.supplier else None,
                'lowest_bid': lowest_bid_info,
                'all_offers': offers_data,  # All offers/bids for this order
                'items': [{
                    'item_name': item.item_name,
                    'quantity': item.quantity,
                    'supplier_price': item.buyer_price,
                    'item_total_price': item.quantity * (item.buyer_price or 0),
                    'allergy_info': item.allergy_info or 'None'
                } for item in order.items.all()]
            }
            order_list.append(order_data)

        return Response({
            'message': 'Orders fetched successfully.',
            'orders': order_list
        }, status=status.HTTP_200_OK)

class OrderSendSupplier(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        buyer = request.user
        print("buyer_id: ",buyer.id)
        buyer_id = buyer.id  
        # # Get the latest order
        latest_order = Order.objects.latest('id')
        print(f"Latest Order: {latest_order}")

        # # Get all order items from the latest order
        order_items = OrderItem.objects.filter(order=latest_order)
        print(f"Order Items: {order_items}")
        # # Get all suppliers
        suppliers = User.objects.filter(is_supplier=True)
        if not suppliers.exists():
            return Response({'error': 'No suppliers found.'}, status=404)
        print(f"Suppliers: {suppliers}")
 
        # # Create SentOrderItem entries for each supplier and order item
        for supplier in suppliers:
            # Skip notification if supplier is the same as the buyer (shouldn't happen in normal flow)
            if supplier == buyer:
                continue
                
            for item in order_items:
                SentOrderItem.objects.create(
                    supplier=supplier,
                    order_item=item,
                    buyer=buyer
                )
            
            # Create notification for each supplier about the new order
            create_notification(
                user=supplier,
                type='new_order',
                message=f"New order #{latest_order.id} available from {buyer.username}",
                order_id=latest_order.id,
                buyer_id=buyer.id,
                data={
                    'status': 'pending'
                }
            )

        return Response({
            'message': 'Order sent to all suppliers!',
            'buyer_id': buyer_id  # send it to the frontend
        }, status=status.HTTP_200_OK)

# get orders on suppliers profile
class GetOrders(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request,buyer_id,order_id):
        supplier = request.user
        print('supplier id: ',supplier,'buyer_id: ',buyer_id)
        # Only get SentOrderItems for this supplier
        sent_items = SentOrderItem.objects.filter(
            supplier=supplier, buyer__id=buyer_id
        ).select_related('supplier', 'order_item__order', 'buyer')

        if not sent_items.exists():
            return Response({'message': 'No Orders Yet!'}, status=status.HTTP_200_OK)

        grouped_orders = defaultdict(lambda: {
            'order_id': None,
            'buyer_id': None,
            'buyer_username': '',
            'order_status': '',
            'order_total_price': 0,
            'sent_at': '',
            'items': [],
        })

        for item in sent_items:
            order_id = item.order_item.order.id
            grouped = grouped_orders[order_id]
            print(item.buyer.id)
            
            # Safely format sent_at date
            sent_at_value = ''
            if hasattr(item, 'sent_at') and item.sent_at:
                try:
                    if hasattr(item.sent_at, 'isoformat'):
                        sent_at_value = item.sent_at.isoformat()
                    else:
                        sent_at_value = str(item.sent_at)
                except Exception:
                    sent_at_value = str(item.sent_at)
            
            grouped.update({
                'order_id': order_id,
                'buyer_id': item.buyer.id,
                'order_status': item.order_item.order.status,
                'order_total_price': item.order_item.order.total_price,
                'sent_at': sent_at_value,
            })

            grouped['items'].append({
                'item_name': item.order_item.item_name,
                'quantity': item.order_item.quantity,
                'supplier_price': item.order_item.buyer_price,
                'item_total_price': item.order_item.quantity * item.order_item.buyer_price,
                'order_item_id': item.order_item.id,
                'supplier_username': item.supplier.username,
                'allergy_info': item.order_item.allergy_info or 'None'
            })


        return Response({
            'message': 'Order details fetched successfully!',
            'orders': list(grouped_orders.values())
        }, status=status.HTTP_200_OK)

class GetAllOrders(APIView):
    def get(self, request):
        all_orders = []
        current_user = request.user  # Supplier making the request

        # Get all pending orders that are not assigned to a supplier yet
        pending_orders = Order.objects.filter(
            status='pending'
        ).order_by('-id')  # Newest first
        
        # Also include orders that have been confirmed to this supplier
        confirmed_orders = Order.objects.filter(
            supplier=current_user,
            status='confirmed'
        ).order_by('-id')
        
        # Combine both types of orders
        orders_to_process = list(pending_orders) + list(confirmed_orders)
        
        for order in orders_to_process:
            # Check if this supplier has already placed a bid
            has_bid = Offer.objects.filter(order=order, supplier=current_user, status='available').exists()
            
            # Get all offers for this order (for comparison)
            all_offers = Offer.objects.filter(order=order, status='available').order_by('price')  # Lowest price first
            
            # Get the user-specific item bids for this order
            my_item_bids = {}
            for item in order.items.all():
                item_offer = ItemOffer.objects.filter(
                    order_item=item,
                    supplier=current_user
                ).order_by('-created_at').first()
                
                if item_offer:
                    my_item_bids[item.id] = float(item_offer.price)
            
            # Only process if the order is pending (available for bidding)
            # or if the supplier is the selected supplier for a confirmed order
            # or if the supplier has already placed a bid on this order
            if order.status == 'pending' or order.supplier == current_user or has_bid:
                # Format delivery_date
                delivery_date_value = None
                if order.delivery_date:
                    try:
                        delivery_date_value = str(order.delivery_date)
                    except:
                        delivery_date_value = str(order.delivery_date)
                
                # Format created_at
                created_at_value = None
                if order.created_at:
                    try:
                        created_at_value = str(order.created_at)
                    except:
                        created_at_value = str(order.created_at)
                
                # Get buyer info
                buyer = order.buyer
                buyer_info = {
                    'id': buyer.id,
                    'username': buyer.username,
                    'address': buyer.address if hasattr(buyer, 'address') else None
                }
                
                # Get all offers data
                offers_data = []
                for offer in all_offers:
                    # Safely format offer created_at
                    offer_created_at = None
                    if hasattr(offer, 'created_at') and offer.created_at:
                        try:
                            offer_created_at = str(offer.created_at)
                        except Exception:
                            offer_created_at = str(offer.created_at)
                            
                    # Get item-level bid prices for this offer's supplier
                    offer_item_prices = {}
                    for item in order.items.all():
                        item_offer = ItemOffer.objects.filter(
                            order_item=item,
                            supplier=offer.supplier
                        ).order_by('-created_at').first()
                        
                        if item_offer:
                            offer_item_prices[item.id] = float(item_offer.price)
                    
                    offers_data.append({
                        'supplier_id': offer.supplier.id,
                        'supplier_username': offer.supplier.username,
                        'price': float(offer.price),
                        'is_my_offer': offer.supplier.id == current_user.id,
                        'created_at': offer_created_at,
                        'item_prices': offer_item_prices
                    })
                
                # Get the lowest bidder for this order
                lowest_offer = all_offers.first()
                lowest_bidder_id = lowest_offer.supplier.id if lowest_offer else None
                lowest_bid_amount = float(lowest_offer.price) if lowest_offer else 0
                
                # Get order items for this order
                order_items = OrderItem.objects.filter(order=order)
                items = []
                
                for item in order_items:
                    items.append({
                        'order_item_id': item.id, 
                        'item_name': item.item_name,
                        'quantity': item.quantity,
                        'buyer_price': item.buyer_price,
                        'item_total_price': item.quantity * (item.buyer_price or 0),
                        'allergy_info': item.allergy_info or 'None'
                    })
                
                order_data = {
                    'order_id': order.id,
                    'buyer_id': order.buyer_id,
                    'buyer_username': buyer_info['username'],
                    'buyer_address': buyer_info['address'],
                    'created_at': created_at_value,
                    'delivery_date': delivery_date_value,
                    'note': order.note if order.note else "",
                    'status': order.status,
                    'buyer_original_price': order.total_price,  # Original price set by buyer
                    'my_item_bids': my_item_bids,  # Current user's item offers
                    'lowest_bid': {
                        'amount': lowest_bid_amount,
                        'supplier_id': lowest_bidder_id
                    },
                    'is_lowest_bidder': lowest_bidder_id == current_user.id,
                    'all_offers': offers_data,
                    'items': items
                }
                
                all_orders.append(order_data)
                
        return Response({"orders": all_orders}, status=status.HTTP_200_OK)


class OfferOrderAPIView(APIView):
    def post(self, request, order_id):
        # Supplier submits an offer for a specific order
    
        order = get_object_or_404(Order, id=order_id) #correct
        
        buyer= order.buyer

        supplier = request.user     #correct
        price = request.data.get('price')  #correct
        estimated_delivery_time = request.data.get('estimated_delivery_time') #correct
        print(buyer)
        # buyer=SentOrderItem.objects.filter(supplier=supplier).first().buyer
        # Create a new offer for the order
        # offer = Offer.objects.create(
        #     order=order,
        #     supplier=supplier,
        #     buyer=buyer,
        #     price=price,
        #     estimated_delivery_time=estimated_delivery_time,
        # )
        # # serialized_offer = OfferSerializer(offer)
        return Response({
            "message": "Offer submitted successfully",
            
        }, status=status.HTTP_201_CREATED)


class ConfirmOrderAPIView(APIView):
    def put(self, request, order_id):
        # Buyer confirms the order after receiving offers
        order = get_object_or_404(Order, id=order_id)
        
        # Current user is the buyer making the confirmation
        current_user = request.user
        
        # Check if delivery date is provided
        delivery_date = request.data.get('delivery_date')
        if not delivery_date:
            return Response({"message": "Delivery date is required to confirm an order"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Check if the buyer has an address set
        if not current_user.address:
            return Response({"message": "You must set your address before confirming an order"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Store original price
        original_price = order.total_price
        
        # Get the lowest bid instead of highest price (only from active offers)
        best_offer = Offer.objects.filter(order=order, status='available').order_by('price').first()

        if not best_offer:
            return Response({"message": "No offers available"}, status=status.HTTP_400_BAD_REQUEST)

        # Update the order to be confirmed and assign the supplier with lowest bid
        order.supplier = best_offer.supplier
        order.status = 'confirmed'
        order.delivery_date = delivery_date
        
        # Update note if provided
        note = request.data.get('note')
        if note is not None:
            order.note = note
        
        # Store the supplier's bid price in a separate field, not overriding the original price
        # We're not updating order.total_price to preserve the buyer's original price
        # Instead, we'll store the accepted bid price in the response
        
        order.save()
        
        # Only notify the supplier (not the buyer who is performing the action)
        # And only if the supplier is not the same as the current user
        if best_offer.supplier != current_user:
            create_notification(
                user=best_offer.supplier,
                type='bid_accepted',
                message=f"Your bid for order #{order.id} was accepted by {order.buyer.username}",
                order_id=order.id,
                buyer_id=order.buyer.id,
                data={
                    'amount': float(best_offer.price),
                    'original_price': float(original_price)
                }
            )
            
            # Send email notifications
            from users.utils import send_order_confirmation_email
            send_order_confirmation_email(
                order=order,
                buyer_email=order.buyer.email,
                supplier_email=best_offer.supplier.email,
                best_offer_price=float(best_offer.price)
            )

        return Response({
            "message": "Order confirmed successfully", 
            "supplier": best_offer.supplier.username, 
            "original_price": str(original_price),
            "accepted_bid": str(best_offer.price),
            "delivery_date": str(order.delivery_date) if order.delivery_date else None,
            "note": order.note or ""
        }, status=status.HTTP_200_OK)

class RejectOrderAPIView(APIView):
    def put(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        
        # Get the supplier and buyer before deleting the order
        supplier = order.supplier
        buyer = order.buyer
        order_id_backup = order.id
        
        # Send notification emails before deleting the order
        if supplier and buyer:
            
            # Notify supplier
            supplier_subject = f"Order #{order_id_backup} Rejected"
            supplier_context = {
                'message': f"Order #{order_id_backup} from {buyer.username} has been rejected."
            }
            send_notification_email(supplier_subject, supplier.email, supplier_context)
            
            # Notify buyer
            buyer_subject = f"Order #{order_id_backup} Rejected"
            buyer_context = {
                'message': f"Your order #{order_id_backup} has been rejected."
            }
            send_notification_email(buyer_subject, buyer.email, buyer_context)
        
        order.delete()

        return Response({"message": "Offer rejected"}, status=status.HTTP_200_OK)

class SupplierOrderConfirmAPIView(APIView):

    def put(self, request, order_id):
        supplier = request.user
        supplier_price = request.data.get('supplier_price')
        item_prices = request.data.get('item_prices', {})
        
        order = get_object_or_404(Order, id=order_id)
        buyer = order.buyer
        
        # Store the original price set by the buyer
        original_order_price = order.total_price

        # Check if supplier already has an offer for this order
        existing_offers = Offer.objects.filter(order=order, supplier=supplier).order_by('-id')
        had_previous_offer = existing_offers.exists()
        previous_offer_price = float(existing_offers.first().price) if had_previous_offer else None
        
        # If supplier already has offers for this order, mark them as unavailable
        if had_previous_offer:
            existing_offers.update(status='unavailable')
        
        # Create a new offer with the supplier price
        new_offer = Offer.objects.create(
            order=order, 
            price=supplier_price, 
            buyer=buyer, 
            supplier=supplier
        )
        
        # Create or update individual ItemOffers for each item in the order
        for item_id, item_price in item_prices.items():
            # Try to get the OrderItem with this ID
            try:
                order_item = OrderItem.objects.get(id=int(item_id), order=order)
                
                # Check if a previous ItemOffer exists from this supplier for this item
                existing_item_offer = ItemOffer.objects.filter(
                    order_item=order_item,
                    supplier=supplier
                ).first()
                
                if existing_item_offer:
                    # Update existing item offer
                    existing_item_offer.price = item_price
                    existing_item_offer.status = 'updated'
                    existing_item_offer.save()
                else:
                    # Create new item offer
                    ItemOffer.objects.create(
                        order_item=order_item,
                        supplier=supplier,
                        price=item_price
                    )
            except OrderItem.DoesNotExist:
                # Skip if item doesn't exist
                continue
                
        # Get all offers for this order to include in response
        # Only include active offers (status='available')
        all_offers = Offer.objects.filter(order=order, status='available').order_by('price')
        offers_data = []
        for offer in all_offers:
            offers_data.append({
                'supplier_id': offer.supplier.id,
                'supplier_username': offer.supplier.username,
                'price': float(offer.price),
                'is_my_offer': offer.supplier.id == supplier.id,
                'created_at': str(offer.created_at) if hasattr(offer, 'created_at') and offer.created_at else None
            })
        
        # Only notify the buyer if they're not the same as the current user (supplier)
        # Also create a more informative message if this is an updated bid
        if buyer != supplier:
            message = ""
            if had_previous_offer:
                message = f"Supplier {supplier.username} updated bid from £{previous_offer_price} to £{supplier_price} for order #{order.id}"
            else:
                message = f"Supplier {supplier.username} placed new bid of £{supplier_price} for order #{order.id}"
                
            create_notification(
                user=buyer,
                type='new_bid',
                message=message,
                order_id=order.id,
                supplier_id=supplier.id,
                data={
                    'amount': float(supplier_price),
                    'previous_amount': previous_offer_price,
                    'is_update': had_previous_offer,
                    'items': item_prices
                }
            )
            
            # Send email notification to buyer
            from users.utils import send_offer_notification_email
            send_offer_notification_email(
                order=order,
                supplier=supplier,
                buyer_email=buyer.email,
                price=supplier_price
            )

        # Construct appropriate message for response
        response_message = "New bid placed successfully" if not had_previous_offer else f"Bid updated from £{previous_offer_price} to £{supplier_price}"
        
        return Response({
            "message": f"{response_message}. The buyer's original price has been preserved.",
            "order_id": order.id,
            "buyer_original_price": original_order_price,
            "your_bid_price": supplier_price,
            "previous_bid_price": previous_offer_price,
            "all_offers": offers_data,
            "delivery_date": str(order.delivery_date) if order.delivery_date else None,
            "note": order.note or ""
        }, status=status.HTTP_200_OK)

class UpdateOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        
        # Check if the user is authorized to update this order
        if request.user != order.buyer and not request.user.is_staff:
            return Response({"error": "You don't have permission to update this order"}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        # Current user is the buyer making the update - they should NOT receive notifications
        current_user = request.user
        
        # Store old values for comparison
        old_status = order.status
        old_note = order.note
        old_delivery_date = order.delivery_date
        
        # Update order fields if provided in the request
        if 'status' in request.data:
            new_status = request.data.get('status')
            
            # If changing from confirmed to something else, remove supplier assignment
            if old_status == 'confirmed' and new_status != 'confirmed':
                order.supplier = None
                
            order.status = new_status
        
        if 'note' in request.data:
            order.note = request.data.get('note')
            
        if 'delivery_date' in request.data:
            # Handle delivery date properly - could be string or date object or None
            delivery_date = request.data.get('delivery_date')
            if delivery_date:
                # Let Django's model field handle the conversion
                order.delivery_date = delivery_date
            else:
                order.delivery_date = None
            
        order.save()
        
        # Only notify supplier if it's assigned and changes are relevant
        # Never notify the buyer who is making these changes
        if order.supplier and order.supplier != current_user:
            # Status change notification
            if 'status' in request.data and old_status != order.status:
                create_notification(
                    user=order.supplier,
                    type='order_update',
                    message=f"Order #{order.id} status changed to {order.status}",
                    order_id=order.id,
                    buyer_id=order.buyer.id,
                    data={
                        'status': order.status,
                        'update_type': 'status'
                    }
                )
                
                # Send email notification for status change
                from users.utils import send_status_update_email
                send_status_update_email(
                    order=order,
                    user_email=order.supplier.email
                )
            
            # Note update notification
            if 'note' in request.data and old_note != order.note:
                create_notification(
                    user=order.supplier,
                    type='order_update',
                    message=f"Note updated for order #{order.id}",
                    order_id=order.id,
                    buyer_id=order.buyer.id,
                    data={
                        'note': order.note,
                        'update_type': 'note'
                    }
                )
                
            # Delivery date update notification
            if 'delivery_date' in request.data and old_delivery_date != order.delivery_date:
                # Safe way to format the date without using strftime directly
                try:
                    if order.delivery_date:
                        # Try to format using string formatting
                        if hasattr(order.delivery_date, 'strftime'):
                            delivery_date_str = order.delivery_date.strftime('%d/%m/%Y')
                        else:
                            # Just use it as string
                            delivery_date_str = str(order.delivery_date)
                    else:
                        delivery_date_str = 'not set'
                except Exception as e:
                    # Fallback if any error occurs
                    delivery_date_str = str(order.delivery_date) if order.delivery_date else 'not set'
                    
                create_notification(
                    user=order.supplier,
                    type='order_update',
                    message=f"Delivery date for order #{order.id} changed to {delivery_date_str}",
                    order_id=order.id,
                    buyer_id=order.buyer.id,
                    data={
                        'delivery_date': str(order.delivery_date) if order.delivery_date else None,
                        'update_type': 'delivery_date'
                    }
                )
        
        return Response({
            "message": "Order updated successfully", 
            "order_id": order.id,
            "status": order.status,
            "note": order.note,
            "delivery_date": str(order.delivery_date) if order.delivery_date else None
        }, status=status.HTTP_200_OK)

class UpdateUserAddressAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        user = request.user
        address = request.data.get('address')
        
        if not address:
            return Response({"error": "Address is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the user's address
        user.address = address
        user.save()
        
        return Response({
            "message": "Address updated successfully",
            "address": user.address
        }, status=status.HTTP_200_OK)

class OrderAPIView(APIView):
    # Handles creation of an order
    def post(self, request):
        items = request.data.get('items')  # List of items added to cart by the buyer
        total_price = request.data.get('total_price')  # Total price of the order
        
        # Create the order
        order = Order.objects.create(buyer=request.user, total_price=total_price, status='pending')
        
        # Create order items
        for item in items:
            OrderItem.objects.create(
                order=order,
                item_name=item['name'],
                quantity=item['quantity']
            )
        
        # Send email notification to the buyer
        subject = f"Order #{order.id} Created"
        context = {
            'message': f"Your order #{order.id} has been created successfully.\n"
                      f"Total price: £{order.total_price}\n"
                      f"Status: {order.status}"
        }
        send_notification_email(subject, request.user.email, context)
        
        return Response({"message": "Order created successfully!", "order_id": order.id}, status=status.HTTP_201_CREATED)

# Creates a notification for a user
def create_notification(user, type, message=None, order_id=None, supplier_id=None, buyer_id=None, data=None):
    notification = Notification.objects.create(
        user=user,
        type=type,
        message=message,
        order_id=order_id,
        supplier_id=supplier_id,
        buyer_id=buyer_id,
        data=data or {}
    )
    return notification

# Notification API Views
class NotificationsAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Parse query parameters
        limit = int(request.query_params.get('limit', 10))
        page_param = request.query_params.get('page')
        
        # Base queryset ordered by newest first
        notifications_qs = Notification.objects.filter(user=user).order_by('-created_at')
        
        if page_param:
            # Paginated mode (former AllNotificationsAPIView)
            page = int(page_param)
            # Default to 20 per page for paginated view (keeping the original behavior)
            if 'limit' not in request.query_params:
                limit = 20
                
            # Calculate offset for pagination
            offset = (page - 1) * limit
            
            # Get total count for pagination
            total_count = notifications_qs.count()
            
            # Get paginated notifications
            notifications = notifications_qs[offset:offset+limit]
        else:
            # Simple mode (former NotificationsAPIView) - just get latest N
            notifications = notifications_qs[:limit]
            total_count = None
        
        notifications_data = []
        for notification in notifications:
            # Format the data based on notification type
            notification_data = {
                'id': notification.id,
                'type': notification.type,
                'message': notification.message,
                'read': notification.read,
                'created_at': notification.created_at,
                'order_id': notification.order_id,
            }
            
            # Add type-specific data
            if notification.type == 'new_bid':
                supplier = User.objects.filter(id=notification.supplier_id).first()
                notification_data['supplier_name'] = supplier.username if supplier else 'Unknown Supplier'
                notification_data['bid_amount'] = notification.data.get('amount', 0)
                
            elif notification.type == 'bid_accepted':
                if user.is_buyer:
                    supplier = User.objects.filter(id=notification.supplier_id).first()
                    notification_data['supplier_name'] = supplier.username if supplier else 'Unknown Supplier'
                else:
                    buyer = User.objects.filter(id=notification.buyer_id).first()
                    notification_data['buyer_name'] = buyer.username if buyer else 'Unknown Buyer'
                    
            notifications_data.append(notification_data)
            
        # Build response based on mode
        response_data = {
            'notifications': notifications_data
        }
        
        # Add pagination metadata if in paginated mode
        if page_param:
            response_data.update({
                'total': total_count,
                'page': page,
                'pages': (total_count + limit - 1) // limit  # Ceiling division
            })
            
        return Response(response_data, status=status.HTTP_200_OK)

class MarkNotificationReadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, notification_id):
        user = request.user
        notification = get_object_or_404(Notification, id=notification_id, user=user)
        
        notification.read = True
        notification.save()
        
        return Response({
            'message': 'Notification marked as read'
        }, status=status.HTTP_200_OK)

class UnreadNotificationCountAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        count = Notification.objects.filter(user=user, read=False).count()
        
        return Response({
            'count': count
        }, status=status.HTTP_200_OK)

class MarkAllNotificationsReadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        user = request.user
        Notification.objects.filter(user=user, read=False).update(read=True)
        
        return Response({
            'message': 'All notifications marked as read'
        }, status=status.HTTP_200_OK)

class DeleteOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, order_id):
        # Get the order
        order = get_object_or_404(Order, id=order_id)
        
        # Check if the user is authorized to delete this order
        if request.user != order.buyer:
            return Response({"error": "You don't have permission to delete this order"}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        # Only allow deletion if the order is in 'pending' status
        if order.status != 'pending':
            return Response({"error": "Only pending orders can be deleted"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        # Store order ID for response
        deleted_order_id = order.id
        
        # Delete the order (this will cascade delete related items due to foreign key relationships)
        order.delete()
        
        return Response({
            "message": "Order deleted successfully", 
            "order_id": deleted_order_id
        }, status=status.HTTP_200_OK)

class GetMyBidsAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        supplier = request.user
        
        # Only suppliers can view their bids
        if not supplier.is_supplier:
            return Response(
                {"message": "Only suppliers can view their bids"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Get all active offers/bids made by this supplier
        my_offers = Offer.objects.filter(supplier=supplier, status='available').order_by('-id')
        
        # Group offers by order
        grouped_bids = {}
        
        for offer in my_offers:
            order_id = offer.order.id
            
            # Initialize order data if this is the first offer for this order
            if order_id not in grouped_bids:
                order = offer.order
                buyer = order.buyer
                
                # Safely format delivery_date
                delivery_date_value = None
                if order.delivery_date:
                    try:
                        delivery_date_value = str(order.delivery_date)
                    except Exception:
                        delivery_date_value = str(order.delivery_date)
                
                # Safely format created_at
                created_at_value = None
                if order.created_at:
                    try:
                        created_at_value = str(order.created_at)
                    except Exception:
                        created_at_value = str(order.created_at)
                
                grouped_bids[order_id] = {
                    'order_id': order_id,
                    'buyer_username': buyer.username,
                    'buyer_id': buyer.id,
                    'order_status': order.status,
                    'buyer_original_price': float(order.total_price),
                    'delivery_date': delivery_date_value,
                    'note': order.note or "",
                    'created_at': created_at_value,
                    'my_bids': []
                }
            
            # Safely format offer created_at
            offer_created_at = None
            if hasattr(offer, 'created_at') and offer.created_at:
                try:
                    offer_created_at = str(offer.created_at)
                except Exception:
                    offer_created_at = str(offer.created_at)
            
            # Add this offer to the order's bids list
            grouped_bids[order_id]['my_bids'].append({
                'bid_id': offer.id,
                'price': float(offer.price),
                'created_at': offer_created_at,
                'is_latest': offer == my_offers.filter(order=offer.order).first()
            })
        
        # Convert grouped_bids dictionary to a list for the response
        response_data = list(grouped_bids.values())
        
        return Response({
            'message': 'Your bids retrieved successfully',
            'orders_with_bids': response_data
        }, status=status.HTTP_200_OK)

class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "address": user.address,
            "is_buyer": user.is_buyer,
            "is_supplier": user.is_supplier
        }, status=status.HTTP_200_OK)
