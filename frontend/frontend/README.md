# **Mikail Platform Technical Documentation**

## **Overview:**

It’s a web-based procurement system connecting buyers and suppliers. The system facilitates order creation, bidding, and order management with real time notifications and email alerts.

## Prerequisites

- Python 3.8+ (for backend)
- Node.js 16+ (for frontend)
- npm or yarn (for frontend package management)

## **Technology Stack:**

- Backend: Django, Django DRF, JWT Auth
- Frontend: ReactJS
- Database: SQLite for development and PostgreSQL for the production.
- Authentication: JSON Web Token (JWT)
- Notifications: In-app notification + Email Alerts

## **Frontend Architecture:**

### Core Components:

1. **App.js** (frontend/frontend/src/App.js): Main application component that handles routing logic, conditionally renders the navbar based on authentication state, and implements protected routes to ensure users can only access appropriate sections based on their role.
2. **Navbar** (frontend/frontend/src/components/Navbar.js): Navigation bar displaying role specific links, a notification counter badge showing unread notifications count, user information from context, and logout functionality that clears authentication tokens.

### **Authentication Components:**

1. **LoginPage** (frontend/frontend/src/components/LoginPage.js): User authentication component that posts credentials to the backend API, stores received JWT tokens in localStorage, updates the user context with role information, and navigates to the appropriate dashboard upon successful login.
2. **RegisterPage** (frontend/frontend/src/components/RegisterPage.js): User registration component with role selection (buyer/supplier) that validates inputs, submits new account details to the API, and provides appropriate error messages for already-taken usernames or validation failures.
3. **LandingPage** (frontend/frontend/src/components/LandingPage.js): Entry point of the application featuring a welcome message, login and registration buttons, and promotional imagery designed to introduce users to the platform's capabilities.

### **Profile Components:**

1. **BuyerProfile** (frontend/frontend/src/components/BuyerProfile.js): A buyer dashboard featuring account information display, address management with validation (required for order confirmation), order listing with filters and pagination, bid acceptance functionality, and order status and delivery date updates.
2. **SupplierProfile** (frontend/frontend/src/components/SupplierProfile.js): A supplier dashboard offering available orders for bidding, a bid placement interface with item-level pricing, order status tracking, buyer address information display, and active bids management with historical view.

### Order Management Components:

1. **MenuPage** (frontend/frontend/src/components/MenuPage.js): Order creation interface displaying available items for selection, shopping cart functionality with quantity adjustments, allergy information input, and order submission that distributes the order to suppliers.

### Notification Components:

1. **NotificationsPage** (frontend/frontend/src/pages/NotificationsPage.js): Full-page notification management with paginated display, mark as ead functionality for individual and all notifications, unread count display, and custom formatting based on notification types.
2. **BuyerNotification** (frontend/frontend/src/components/BuyerNotification.js): Buyer specific notification component that filters notifications related to bid submissions, order status changes, and other buyer-relevant events.
3. **SupplierNotifications** (frontend/frontend/src/components/SupplierNotifications.js): Supplier focused notification component showing new order opportunities, bid acceptance notifications, and order status updates relevant to the supplier's active orders.

### Utility Components:

1. **UserContext** (frontend/frontend/src/Context/UserContext.js): Context provider managing global authentication state, user information, and providing functions to update this state throughout the application.
2. **OrderContext** (frontend/frontend/src/Context/OrderContext.js): Context provider for order related data, facilitating communication between components involved in the order creation and management process.

## **Backend Architecture:**

### Core Settings:

1. **settings.py** (mikail_platform/settings.py): Central configuration file containing database settings, installed apps, middleware, authentication backends (JWT), CORS settings, and email configuration which can be modified by updating the EMAIL_HOST_USER and EMAIL_HOST_PASSWORD fields.
2. **urls.py** (mikail_platform/urls.py): Main URL configuration that routes to the admin panel, includes API endpoints from the users app, and provides a redirect from the root path to the API root.

### Data Models:

1. **User** (users/models.py): Custom user model extending Django's AbstractUser with buyer/supplier role flags and an address field that's now mandatory for order confirmation, forming the foundation of role based access control.
2. **Order** (users/models.py): Central order model tracking the buyer, assigned supplier, total price, status (pending/confirmed/rejected/hold), notes, delivery date, and timestamps, with a method to calculate total price from contained items.
3. **OrderItem** (users/models.py): Item-level order details tracking item name, quantity, buyer price, and allergy information, establishing a one-to-many relationship with parent orders.
4. **SentOrderItem** (users/models.py): Tracking model connecting suppliers with order items and buyers, recording when buyers send orders to suppliers for potential bidding.
5. **Offer** (users/models.py): Supplier bid model for entire orders, tracking price, estimated delivery time, and status with a class method to find the lowest offer for an order.
6. **ItemOffer** (users/models.py): Granular bid model for individual items, allowing suppliers to specify prices and notes per item with status tracking.
7. **Notification** (users/models.py): In app notification system with type classification, read status tracking

### **API Endpoints:**

1. **Authentication** (users/views.py): RegisterAPIView, LoginAPIView, and LogOutAPIView handling user registration with role selection, JWT token generation upon login, and session termination.
2. **Order Management** (users/views.py): CreateOrderAPIView, GetAllOrders, UpdateOrderAPIView, ConfirmOrderAPIView, RejectOrderAPIView, and DeleteOrderAPIView providing comprehensive order lifecycle management with proper permission checks.
3. **Supplier Operations** (users/views.py): OrderSendSupplier, GetOrders, OfferOrderAPIView, SupplierOrderConfirmAPIView, and GetMyBidsAPIView enabling suppliers to receive, view, and bid on orders with appropriate business logic.
4. **Notification Handling** (users/views.py): NotificationsAPIView, MarkNotificationReadAPIView, UnreadNotificationCountAPIView, and MarkAllNotificationsReadAPIView providing notification retrieval with optional pagination and read status management.
5. **User Profile** (users/views.py): UpdateUserAddressAPIView allowing users to update their delivery address, which is now required before confirming orders.

### Email System:

1. **Email Configuration** (mikail_platform/settings.py): Email settings defined with Gmail SMTP parameters that can be modified for production by changing EMAIL_HOST_USER and EMAIL_HOST_PASSWORD. Can you any provider Yahoo, Gmail, Godaddy, or any other provider as long as it provides SMTP.
2. **EmailThread** (users/utils.py): Background threading implementation for non-blocking email delivery, preventing API response delays while emails are being sent.
3. **send_notification_email** (users/utils.py): Generic email sending function using HTML templates, configurable subject lines, and context data, serving as the foundation for all system emails.
4. **send_order_confirmation_email** (users/utils.py): Specialized email function notifying both buyers and suppliers about order confirmations with order details and pricing information.
5. **send_offer_notification_email** (users/utils.py): Email alert function for buyers when suppliers place new bids, including price information and supplier identity.
6. **send_status_update_email** (users/utils.py): Notification function for order status changes, ensuring all parties are informed when order status transitions.
7. **Email Templates** (templates/emails/notification.html): HTML template for email formatting, which can be customized to match branding requirements and improve readability.

### Utilities and Helpers:

1. **create_notification** (users/views.py): Helper function for creating in-app notifications with appropriate type, message, and related entity references, used throughout various API endpoints.
2. **get_lowest_offer** (users/models.py): Utility method on the Offer model to efficiently find the lowest price bid (lower the better) for an order, used in the order confirmation process.
3. **Authentication Backends** (mikail_platform/settings.py): Configuration for Django's ModelBackend and JWTAuthentication, enabling both traditional and token-based authentication.

### Security Measures:

1. **Permission Classes** (users/views.py): API endpoints use IsAuthenticated and AllowAny permission classes appropriately to secure endpoints based on authentication status.
2. **JWT Configuration** (mikail_platform/settings.py): Token-based authentication setup with simple JWT, providing secure, stateless authentication between frontend and backend.
3. **Serializers** (users/serializers.py): Data validation layer that sanitizes incoming requests, enforces field requirements, and prevents injection attacks by properly converting between Python objects and JSON representations before processing.

## **Installation Instructions:**

### **Backend Setup (Django):**

1. **Set Up Virtual Environment:**
    
    > python -m venv venv
    > 
    
    on windows:
    
    > venv\Scripts\activate
    > 
    
    on mac/linux:
    
    > source venv/bin/activate
    > 
2. **Install Dependencies:**
    
    > pip install -r requirements.txt
    > 
3. **Configure Email Settings:**
    
    Edit mikail_platform/settings.py and update the email configuration:
    
    > EMAIL_HOST_USER
    > 
    
    > EMAIL_HOST_PASSWORD
    > 
    
    For Gmail, you need to:
    
    1. Enable 2-Factor Authentication on your Google account
    2. Generate an "App Password" from your Google Account settings
    3. Use that App Password instead of your regular password
4. **Database Setup:**
    
     **Apply migrations to create database structure
    
    > python [manage.py](http://manage.py/) makemigrations
    > 
    
    > python [manage.py](http://manage.py) migrate
    > 
5. **Run the Django Server:**
    
    > python [manage.py](http://manage.py/) runserver
    > 
    
    The backend will be available at http://localhost:8000/
    

### Frontend Setup (React):

1. **Navigate to Frontend Directory:**
    
    > cd frontend/frontend
    > 
2. **Install Dependencies:**
    
    If you’re using npm
    
    > npm install
    > 
    
    if you’re using yarn
    
    > yarn install
    > 
3. **Run the Frontend Development Server:**
    
    If you’re using npm
    
    > npm start
    > 
    
    if you’re using yarn
    
    > yarn start
    > 
    
    The frontend will be available at http://localhost:3000/


















# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
