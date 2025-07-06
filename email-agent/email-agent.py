#!/usr/bin/env python3
"""
AI Email Management Agent
------------------------
An automated system that connects to IMAP email servers, processes incoming emails,
classifies them (spam/receipts/etc), and organizes them into appropriate folders.

Requirements:
- Python 3.8+
- Required packages: imaplib, email, scikit-learn, nltk, python-dotenv, schedule
"""

import imaplib
import email
import re
import os
import time
import logging
import pickle
import schedule
from email.header import decode_header
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# For NLP and ML components
import nltk
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("email_ai_agent.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("EmailAIAgent")

# Load environment variables from .env file
load_dotenv()

class EmailAIAgent:
    def __init__(self):
        """Initialize the Email AI Agent."""
        # Email server configuration
        self.email_address = os.getenv("EMAIL_ADDRESS")
        self.password = os.getenv("EMAIL_PASSWORD")
        self.imap_server = os.getenv("IMAP_SERVER", "imap.gmail.com")
        self.imap_port = int(os.getenv("IMAP_PORT", 993))
        
        # Initialize folder paths
        self.model_dir = Path("models")
        self.model_dir.mkdir(exist_ok=True)
        
        # Load or train the spam classifier
        self.spam_classifier = self._load_or_train_spam_classifier()
        
        # Download NLTK resources if needed
        self._setup_nltk()
        
        # Define email categorization rules
        self.email_rules = {
            "receipts": [
                r"receipt", r"order confirmation", r"invoice", r"payment",
                r"transaction", r"purchase", r"order #", r"thank you for your order"
            ],
            "bills": [
                r"bill", r"statement", r"due date", r"payment due", r"utility",
                r"monthly statement", r"credit card statement"
            ],
            "newsletters": [
                r"newsletter", r"update", r"weekly digest", r"monthly report",
                r"subscription"
            ],
            # Add more categories as needed
        }
        
        logger.info("Email AI Agent initialized successfully")

    def _setup_nltk(self):
        """Download required NLTK resources."""
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords')

    def _load_or_train_spam_classifier(self):
        """Load existing spam classifier or train a new one."""
        model_path = self.model_dir / "spam_classifier.pkl"
        
        if model_path.exists():
            logger.info("Loading existing spam classifier model")
            with open(model_path, 'rb') as f:
                return pickle.load(f)
        else:
            logger.info("Training new spam classifier model")
            # In a real implementation, you would train on a dataset
            # For now, we'll create a simple model with limited training data
            
            # Example training data (would be much larger in practice)
            spam_examples = [
                "Congratulations! You've won a million dollars!",
                "URGENT: Your account has been compromised",
                "Low-cost medications online",
                "Make money fast working from home",
                "Increase your performance with this pill"
            ]
            
            ham_examples = [
                "Meeting scheduled for tomorrow at 2pm",
                "Your order has been shipped",
                "Monthly newsletter from your bank",
                "Invoice for your recent purchase",
                "Thank you for your payment"
            ]
            
            X = spam_examples + ham_examples
            y = ["spam"] * len(spam_examples) + ["ham"] * len(ham_examples)
            
            # Create and train a simple pipeline
            text_clf = Pipeline([
                ('tfidf', TfidfVectorizer(stop_words='english')),
                ('clf', MultinomialNB())
            ])
            
            text_clf.fit(X, y)
            
            # Save the model
            with open(model_path, 'wb') as f:
                pickle.dump(text_clf, f)
            
            logger.info("New spam classifier model trained and saved")
            return text_clf

    def connect_to_email(self):
        """Connect to the IMAP server and login."""
        try:
            # Connect to the IMAP server
            self.mail = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
            
            # Login to the email account
            self.mail.login(self.email_address, self.password)
            
            logger.info(f"Successfully connected to {self.imap_server}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to email: {str(e)}")
            return False

    def fetch_unread_emails(self, folder="INBOX", limit=10):
        """Fetch unread emails from the specified folder."""
        emails = []
        
        try:
            # Select the mailbox/folder
            status, messages = self.mail.select(folder)
            
            if status != "OK":
                logger.error(f"Failed to select folder {folder}")
                return emails
            
            # Search for unread emails
            status, data = self.mail.search(None, 'UNSEEN')
            
            if status != "OK":
                logger.error("Failed to search for unread emails")
                return emails
            
            # Get the list of email IDs
            email_ids = data[0].split()
            
            # Limit the number of emails to process
            email_ids = email_ids[:limit]
            
            for email_id in email_ids:
                status, data = self.mail.fetch(email_id, "(RFC822)")
                
                if status != "OK":
                    logger.error(f"Failed to fetch email with ID {email_id}")
                    continue
                
                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                # Process email headers
                subject = self._decode_email_header(msg["Subject"])
                from_address = self._decode_email_header(msg["From"])
                date_str = self._decode_email_header(msg["Date"])
                
                # Extract email body
                body = self._get_email_body(msg)
                
                # Add to our list
                emails.append({
                    "id": email_id,
                    "subject": subject,
                    "from": from_address,
                    "date": date_str,
                    "body": body,
                    "raw": msg
                })
                
                logger.debug(f"Fetched email: {subject}")
            
            logger.info(f"Fetched {len(emails)} unread emails from {folder}")
            return emails
        
        except Exception as e:
            logger.error(f"Error fetching emails: {str(e)}")
            return emails

    def _decode_email_header(self, header):
        """Decode email header."""
        if header is None:
            return ""
        
        decoded_parts = decode_header(header)
        decoded_header = ""
        
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                if encoding:
                    decoded_header += part.decode(encoding)
                else:
                    decoded_header += part.decode('utf-8', errors='replace')
            else:
                decoded_header += part
        
        return decoded_header

    def _get_email_body(self, msg):
        """Extract the email body text."""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                
                # Skip attachments
                if "attachment" in content_disposition:
                    continue
                
                # Get the body text
                if content_type == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                        return body
                    except Exception as e:
                        logger.error(f"Error extracting email body: {str(e)}")
        else:
            # Not multipart - get the payload directly
            try:
                body = msg.get_payload(decode=True).decode('utf-8', errors='replace')
                return body
            except Exception as e:
                logger.error(f"Error extracting email body: {str(e)}")
        
        return ""

    def is_spam(self, email_data):
        """Classify if an email is spam."""
        # Combine subject and body for better classification
        text = f"{email_data['subject']} {email_data['body']}"
        
        # Make prediction
        prediction = self.spam_classifier.predict([text])[0]
        
        return prediction == "spam"

    def categorize_email(self, email_data):
        """Categorize an email based on defined rules."""
        # Check if it's spam first
        if self.is_spam(email_data):
            return "spam"
        
        # Combine subject and body for categorization
        text = f"{email_data['subject']} {email_data['body']}".lower()
        
        # Check each category
        for category, patterns in self.email_rules.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return category
        
        # Default category
        return "uncategorized"

    def move_email(self, email_id, target_folder):
        """Move an email to the specified folder."""
        try:
            # Check if the folder exists, create if it doesn't
            status, _ = self.mail.list()
            folder_exists = False
            
            if status == "OK":
                for folder_info in self.mail.list()[1]:
                    if target_folder.encode() in folder_info:
                        folder_exists = True
                        break
            
            if not folder_exists:
                # Create the folder
                self.mail.create(target_folder)
                logger.info(f"Created new folder: {target_folder}")
            
            # Move the email
            result = self.mail.copy(email_id, target_folder)
            
            if result[0] == "OK":
                # Mark the original email for deletion
                self.mail.store(email_id, '+FLAGS', '\\Deleted')
                logger.info(f"Moved email {email_id} to {target_folder}")
                return True
            else:
                logger.error(f"Failed to move email {email_id} to {target_folder}")
                return False
        
        except Exception as e:
            logger.error(f"Error moving email: {str(e)}")
            return False

    def process_emails(self):
        """Main method to process incoming emails."""
        logger.info("Starting email processing")
        
        # Connect to the email server
        if not self.connect_to_email():
            return
        
        try:
            # Fetch unread emails
            emails = self.fetch_unread_emails()
            
            if not emails:
                logger.info("No unread emails to process")
                return
            
            # Process each email
            for email_data in emails:
                # Categorize the email
                category = self.categorize_email(email_data)
                logger.info(f"Email '{email_data['subject']}' categorized as: {category}")
                
                # Move the email to the appropriate folder
                folder_name = category.upper()
                self.move_email(email_data['id'], folder_name)
            
            # Expunge deleted emails
            self.mail.expunge()
            
            # Close the connection
            self.mail.close()
            self.mail.logout()
            
            logger.info("Email processing completed")
        
        except Exception as e:
            logger.error(f"Error processing emails: {str(e)}")
            
            # Attempt to close the connection
            try:
                self.mail.close()
                self.mail.logout()
            except:
                pass

    def run_scheduled(self, interval_minutes=15):
        """Run the email processing on a schedule."""
        logger.info(f"Setting up scheduled runs every {interval_minutes} minutes")
        
        # Schedule the job
        schedule.every(interval_minutes).minutes.do(self.process_emails)
        
        # Run immediately for the first time
        self.process_emails()
        
        # Keep the script running and execute scheduled jobs
        while True:
            schedule.run_pending()
            time.sleep(1)

    def improve_model(self, feedback_data):
        """Improve the spam classifier based on user feedback."""
        # In a real implementation, you would have a mechanism for users to provide feedback
        # This method would use that feedback to retrain or fine-tune the model
        pass

    def extract_receipt_data(self, email_data):
        """Extract structured data from receipt emails."""
        # This would use more advanced NLP to extract transaction details
        # For now, we'll implement a basic version
        
        if 'receipts' not in self.categorize_email(email_data):
            return None
        
        receipt_data = {
            "date": None,
            "amount": None,
            "vendor": None,
            "order_number": None
        }
        
        # Extract data using regex patterns (very simplified)
        text = f"{email_data['subject']} {email_data['body']}"
        
        # Try to find amount
        amount_match = re.search(r'\$\s*(\d+\.\d{2})', text)
        if amount_match:
            receipt_data["amount"] = amount_match.group(1)
        
        # Try to find order number
        order_match = re.search(r'order[:\s#]+([A-Z0-9-]+)', text, re.IGNORECASE)
        if order_match:
            receipt_data["order_number"] = order_match.group(1)
        
        # Extract vendor from email address domain
        from_address = email_data['from']
        domain_match = re.search(r'@([^>]+)', from_address)
        if domain_match:
            receipt_data["vendor"] = domain_match.group(1).split('.')[0]
        
        return receipt_data


def setup_environment():
    """Create necessary environment files if they don't exist."""
    # Create .env file template if it doesn't exist
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write("""# Email AI Agent Configuration
EMAIL_ADDRESS=your_email@example.com
EMAIL_PASSWORD=your_password
IMAP_SERVER=imap.example.com
IMAP_PORT=993
CHECK_INTERVAL=15  # minutes
""")
        print("Created .env file template. Please edit it with your email credentials.")

    # Create systemd service file
    service_file = """[Unit]
Description=Email AI Agent
After=network.target

[Service]
User=YOUR_USERNAME
WorkingDirectory=/path/to/email_ai_agent
ExecStart=/usr/bin/python3 /path/to/email_ai_agent/run.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
"""
    
    with open('email_ai_agent.service', 'w') as f:
        f.write(service_file)
    
    print("Created systemd service file template. Please edit it with your details.")


def main():
    """Main entry point for the script."""
    # Setup environment if needed
    setup_environment()
    
    # Check if environment is configured
    if os.getenv("EMAIL_ADDRESS") in [None, "your_email@example.com"]:
        print("Please configure your .env file before running the agent.")
        return
    
    # Create and run the agent
    agent = EmailAIAgent()
    
    # Get the check interval from environment or use default
    interval = int(os.getenv("CHECK_INTERVAL", 15))
    
    # Run the agent on a schedule
    agent.run_scheduled(interval)


if __name__ == "__main__":
    main()
