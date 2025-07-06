# Email AI Agent - Installation Guide

This guide will help you install and set up the Email AI Agent on your Debian server.

## Prerequisites

- Debian-based server (Debian, Ubuntu, etc.)
- Python 3.8 or higher
- Administrative access to the server

## Step 1: Install Required System Packages

Update your package lists and install required system dependencies:

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git
```

## Step 2: Clone or Create the Project

### Option 1: Create the Project Manually

Create a directory for the project:

```bash
mkdir -p ~/email_ai_agent
cd ~/email_ai_agent
```

Download the main script that was shared with you and save it as `run.py`.

### Option 2: Clone from Git (if you've stored it in a repository)

```bash
git clone [your-repository-url] ~/email_ai_agent
cd ~/email_ai_agent
```

## Step 3: Create a Virtual Environment

Set up a Python virtual environment to manage dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
```

## Step 4: Install Required Python Packages

Install all the required Python packages:

```bash
pip install imaplib2 scikit-learn nltk python-dotenv schedule
```

## Step 5: Configure the Agent

Run the script once to generate the template files:

```bash
python run.py
```

This will create a `.env` file template. Edit this file with your email credentials:

```bash
nano .env
```

Update the following settings:

```
EMAIL_ADDRESS=your_email@example.com
EMAIL_PASSWORD=your_app_password
IMAP_SERVER=imap.example.com
IMAP_PORT=993
CHECK_INTERVAL=15  # minutes
```

Notes:
- For Gmail, use `imap.gmail.com` as the IMAP server
- You may need to create an app password if you use 2FA
- For other providers, check their IMAP server details

## Step 6: Test the Agent

Run the agent manually to verify it works correctly:

```bash
python run.py
```

The agent should connect to your email, process any unread messages, and log its activities. Let it run for a few minutes to ensure it's working as expected.

## Step 7: Set Up as a System Service

Edit the systemd service file:

```bash
sudo nano /etc/systemd/system/email-ai-agent.service
```

Paste the following content, replacing placeholders with your actual values:

```
[Unit]
Description=Email AI Agent
After=network.target

[Service]
User=your_username
WorkingDirectory=/home/your_username/email_ai_agent
ExecStart=/home/your_username/email_ai_agent/venv/bin/python /home/your_username/email_ai_agent/run.py
Restart=on-failure
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable email-ai-agent
sudo systemctl start email-ai-agent
```

## Step 8: Monitor the Service

Check the status of the service:

```bash
sudo systemctl status email-ai-agent
```

View the logs:

```bash
journalctl -u email-ai-agent -f
```

You can also check the application's own logs:

```bash
cat ~/email_ai_agent/email_ai_agent.log
```

## Customization Options

### Adding New Email Categories

Edit the `run.py` file to add new categories by adding patterns to the `email_rules` dictionary:

```python
self.email_rules = {
    # Existing categories...
    "travel": [
        r"flight confirmation", r"booking", r"itinerary", r"travel",
        r"hotel reservation", r"boarding pass"
    ],
    # Add more as needed
}
```

### Improving the Spam Classifier

For better spam detection, you can:

1. Collect more training data
2. Implement user feedback mechanisms
3. Use more advanced ML models

### Advanced Features

Consider implementing:

- Email attachment processing
- Integration with other services via webhooks
- Web interface for monitoring and configuration
- Regular model retraining based on user feedback

## Troubleshooting

### Connection Issues

If you're having trouble connecting to your email:

1. Verify your credentials in the `.env` file
2. Check that less secure apps are enabled (if using Gmail)
3. Confirm you're using the correct IMAP server and port

### Permission Issues

If you encounter permission errors:

1. Check that the service is running as the correct user
2. Verify file permissions on the script and configuration files

### Classification Problems

If emails are being incorrectly classified:

1. Review and refine the pattern matching rules
2. Collect more training data for the spam classifier
3. Implement a feedback mechanism to improve classifications over time

## Support

For additional help or to report issues, please create an issue in the repository or contact the developer directly.
