# Mikail Platform - Ordering, Bidding, and Label Printing System

## Overview

Mikail is a web-based bidding platform connecting buyers and suppliers.  
Buyers place orders with item names and quantities, suppliers place bids, and the lowest bid is forwarded to the buyer.  
After confirming the order with address, notes, and delivery date, suppliers are notified.  
Manual payment is currently used (automated system coming soon).  
Users can also print food labels showing allergen information, calorie count, spice level, product description, and price.

## Technology Stack

- Backend: Django, Django REST Framework, JWT Authentication
- Frontend: ReactJS
- Database: SQLite (development), PostgreSQL (production)
- Notifications: In-app + Email Alerts
- Authentication: JSON Web Token (JWT)

## Installation and Running Instructions

### 1. Clone the Project Repository

Clone your project from GitHub:

git clone https://github.com/aroleece/Mikail-Part3

### 2. Backend Setup (Django API Server)

Navigate into your project folder:

cd path/to/your/project

Create and activate a virtual environment:

python -m venv venv

On Windows:

venv\Scripts\activate

On macOS/Linux:

source venv/bin/activate

Install backend dependencies:

pip install -r requirements.txt

Set up email settings:

- Open `mikail_platform/settings.py`
- Update:
  - EMAIL_HOST_USER
  - EMAIL_HOST_PASSWORD
(Use Gmail App Password if necessary.)

Apply database migrations:

python manage.py makemigrations

python manage.py migrate

Run the Django server:

python manage.py runserver

The backend will be available at:

http://localhost:8000/

### 3. Frontend Setup (React Client)

Open a new terminal.

Navigate into the frontend directory:

cd frontend/frontend

Install frontend dependencies:

npm install
or
yarn install

Start the frontend server:

npm start
or
yarn start

The frontend will be available at:

http://localhost:3000/
Please note, the registration and login is case sensitive , please use the username name as exactly as registered. Also please look for your order in profile section, the latest order will be at the top. I will upload a video to show the flow of operation.

## System Architecture Overview

Frontend Core Components:

- App.js: Routing and navbar
- LoginPage.js, RegisterPage.js, LandingPage.js: Authentication pages
- BuyerProfile.js, SupplierProfile.js: Dashboards
- MenuPage.js: Cart and Label Management
- NotificationsPage.js, BuyerNotification.js, SupplierNotifications.js
- UserContext.js and OrderContext.js: Global state management

Backend Core Components:

- settings.py: Django settings including JWT, database, CORS, email
- urls.py: URL routing for APIs
- models.py: User, Order, OrderItem, SentOrderItem, Offer, ItemOffer, Notification
- views.py: Logic for authentication, bidding, orders, notifications
- utils.py: Helper functions for asynchronous email notifications

## Future Enhancements

- Integration of Stripe/PayPal for online payments
- Real-time updates using Django Channels (WebSockets)
- Mobile app version using React Native
- Advanced supplier analytics dashboard
- Multi-language internationalization

## Security Measures

- JWT-based authentication
- Django permission classes and endpoint security
- Proper serializer validation for inputs
- Asynchronous email handling
- Production-ready HTTPS configuration

## Contact

- Email: mrahm012@gold.ac.uk  or arolee.ce@gmail.com
- GitHub: https://github.com/aroleece
