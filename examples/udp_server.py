"""One-datagram local UDP echo demonstration. Run before udp_client.py."""
import socket

with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server:
    server.bind(("127.0.0.1", 5051))
    server.settimeout(60)
    print("Listening on 127.0.0.1:5051", flush=True)
    data, sender = server.recvfrom(4096)
    server.sendto(data, sender)
