"""One-client local TCP echo demonstration. Run before tcp_client.py."""
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(("127.0.0.1", 5050))
    listener.listen(1)
    listener.settimeout(60)
    print("Listening on 127.0.0.1:5050", flush=True)
    connection, peer = listener.accept()
    with connection:
        connection.settimeout(10)
        # Echo chunks; TCP does not preserve the client's write boundaries.
        while True:
            chunk = connection.recv(4096)
            if not chunk:  # Peer has closed its sending direction.
                break
            connection.sendall(chunk)
