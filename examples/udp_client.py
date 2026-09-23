"""Send one datagram; timeout is possible because UDP has no recovery."""
import socket

destination = ("127.0.0.1", 5051)
message = b"Hello, datagrams!\n"
with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
    client.settimeout(3)
    client.sendto(message, destination)
    try:
        data, sender = client.recvfrom(4096)
    except socket.timeout:
        print("No reply within 3 seconds; UDP does not retry automatically.")
    else:
        assert sender == destination and data == message, "Unexpected reply"
        print(data.decode("utf-8"), end="")
