from config import send_sms

TWILIO_AUTH_OK = True
twilio_client = None


def init_twilio():
    print("[MOCK] Twilio initialized successfully (simulation mode)")


def send_warning_sms(cell, probability, numbers):
    message_text = f"""
⚠ Temperature Alert
Location: {cell}
Probability: {round(probability * 100, 2)}%
High temperature detected.
Please check immediately.
"""

    for number in numbers:
        print(f"[MOCK SMS] To: {number} | Message:\n{message_text}")


def send_custom_sms(number, message_text):
    print(f"[MOCK SMS] To: {number} | Message: {message_text}")
    return True