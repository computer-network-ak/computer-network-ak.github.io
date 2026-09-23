"""Send a bounded request; read the echo until server EOF."""
import socket

message = b"Hello, networks!\n"
with socket.create_connection(("127.0.0.1", 5050), timeout=5) as connection:
    connection.sendall(message)
    connection.shutdown(socket.SHUT_WR)  # End request, keep receiving.
    received = bytearray()
    while True:
        chunk = connection.recv(4096)
        if not chunk:
            break
        received.extend(chunk)
    assert bytes(received) == message, "Echo differs from request"
    print(received.decode("utf-8"), end="")
