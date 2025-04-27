from django.urls import path
from .views import RegisterAPIView, LoginAPIView, APIRootView, LogOutAPIView, GetAllOrders, RejectOrderAPIView, \
    SupplierOrderConfirmAPIView, UpdateOrderAPIView, UpdateUserAddressAPIView, NotificationsAPIView, \
    MarkNotificationReadAPIView, UnreadNotificationCountAPIView, \
    MarkAllNotificationsReadAPIView, GetMyBidsAPIView, DeleteOrderAPIView, UserProfileAPIView

from .views import( CreateOrderAPIView, OfferOrderAPIView, ConfirmOrderAPIView,OrderAPIView,OrderSendSupplier,GetOrders,
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogOutAPIView.as_view(), name='login'),

    path('', APIRootView.as_view(), name='api-root'),




    path('orders/', CreateOrderAPIView.as_view(), name='create-order'),
    path('order-send-suppliers/',OrderSendSupplier.as_view(),name='order-to-supplier'),
    path('notificationOrders/<int:buyer_id>//<int:order_id>/',GetOrders.as_view(),name='get-orders'),
    path('orders/<int:order_id>/offers/', OfferOrderAPIView.as_view(), name='submit-offer'),
    path('all-orders/', GetAllOrders.as_view(), name='all-orders'),
    path('orders/<int:order_id>/confirm/', ConfirmOrderAPIView.as_view(), name='confirm-order'),
    path('orders/<int:order_id>/reject/', RejectOrderAPIView.as_view(), name='reject-order'),
    path('orders/<int:order_id>/update/', UpdateOrderAPIView.as_view(), name='update-order'),
    path('orders/<int:order_id>/delete/', DeleteOrderAPIView.as_view(), name='delete-order'),
    path('update-address/', UpdateUserAddressAPIView.as_view(), name='update-address'),
    path('user-profile/', UserProfileAPIView.as_view(), name='user-profile'),
    path('supplier-orders/<int:order_id>/confirm/', SupplierOrderConfirmAPIView.as_view(), name='supplier-order-confirm'),
    path('my-bids/', GetMyBidsAPIView.as_view(), name='my-bids'),
    
    # Notification endpoints
    path('notifications/', NotificationsAPIView.as_view(), name='notifications'),
    path('notifications/<int:notification_id>/read/', MarkNotificationReadAPIView.as_view(), name='mark-notification-read'),
    path('notifications/unread-count/', UnreadNotificationCountAPIView.as_view(), name='unread-notification-count'),
    path('notifications/read-all/', MarkAllNotificationsReadAPIView.as_view(), name='mark-all-notifications-read'),
]
