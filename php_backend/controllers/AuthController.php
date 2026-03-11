<?php
class AuthController {
    public static function handle($routeParts) {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $routeParts[1] ?? '';

        if ($method === 'POST' && $action === 'register') {
            self::register();
        } elseif ($method === 'POST' && $action === 'login') {
            self::login();
        } elseif ($method === 'GET' && $action === 'me') {
            self::me();
        } elseif ($method === 'POST' && $action === 'google') {
            self::googleLogin();
        } elseif ($method === 'POST' && $action === 'facebook') {
            self::facebookLogin();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Auth endpoint not found']);
        }
    }

    private static function register() {
        $body = getJsonBody();
        $email = $body['email'] ?? null;
        $password = $body['password'] ?? null;
        $firstName = $body['firstName'] ?? null;
        $lastName = $body['lastName'] ?? null;
        $phone = $body['phone'] ?? null;

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }

        $pdo = DB::getConnection();
        
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already registered']);
            return;
        }

        $userId = 'user_' . round(microtime(true) * 1000);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        
        $stmt = $pdo->prepare("INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $email, $hash, 'customer', $firstName, $lastName, $phone]);

        $tokenPayload = ['id' => $userId, 'email' => $email, 'role' => 'customer', 'exp' => time() + 86400];
        $token = JWT::encode($tokenPayload);

        echo json_encode([
            'token' => $token,
            'user' => [
                'id' => $userId, 
                'email' => $email, 
                'role' => 'customer', 
                'firstName' => $firstName, 
                'lastName' => $lastName
            ]
        ]);
    }

    private static function login() {
        $body = getJsonBody();
        $email = $body['email'] ?? null;
        $password = $body['password'] ?? null;

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        $tokenPayload = ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'exp' => time() + 86400];
        $token = JWT::encode($tokenPayload);

        echo json_encode([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name']
            ]
        ]);
    }

    private static function me() {
        $userPayload = Auth::authenticateToken();
        if (!$userPayload) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            return;
        }

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT id, email, role, first_name, last_name, phone, loyalty_points FROM users WHERE id = ?");
        $stmt->execute([$userPayload['id']]);
        $user = $stmt->fetch();

        echo json_encode(['user' => $user]);
    }

    private static function googleLogin() {
        $body = getJsonBody();
        $token = $body['token'] ?? null;

        if (!$token) {
            http_response_code(400);
            echo json_encode(['error' => 'Google token required']);
            return;
        }

        // Just decoding the token locally to match your Node backend demo logic.
        $decoded = JWT::decode($token, 'dummy_secret'); // In a real app we would use Google's JWKS
        if (!$decoded) {
            // Because Google signs it, our custom JWT script will fail validation without the key.
            // Let's just decode the base64 payload safely.
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                 $decoded = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
            }
        }

        if (!$decoded || empty($decoded['email'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid Google token data']);
            return;
        }

        $email = $decoded['email'];
        $firstName = $decoded['given_name'] ?? null;
        $lastName = $decoded['family_name'] ?? null;
        $googleId = $decoded['sub'] ?? null;

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR (oauth_provider = ? AND oauth_id = ?)");
        $stmt->execute([$email, 'google', $googleId]);
        $user = $stmt->fetch();

        if ($user) {
            if (!$user['oauth_provider']) {
                $pdo->prepare("UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?")->execute(['google', $googleId, $user['id']]);
            }
        } else {
            $userId = 'user_' . round(microtime(true) * 1000);
            $stmt = $pdo->prepare("INSERT INTO users (id, email, password_hash, role, first_name, last_name, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $email, null, 'customer', $firstName, $lastName, 'google', $googleId]);
            
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
        }

        $tokenPayload = ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'exp' => time() + 86400];
        $authToken = JWT::encode($tokenPayload);

        echo json_encode([
            'token' => $authToken,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name']
            ]
        ]);
    }

    private static function facebookLogin() {
        $body = getJsonBody();
        $accessToken = $body['accessToken'] ?? null;
        $userID = $body['userID'] ?? null;
        $email = $body['email'] ?? null;
        $name = $body['name'] ?? null;

        if (!$accessToken || !$userID) {
            http_response_code(400);
            echo json_encode(['error' => 'Facebook token and user ID required']);
            return;
        }

        $nameParts = $name ? explode(' ', $name) : [];
        $firstName = $nameParts[0] ?? null;
        $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : null;

        $userEmail = $email ?: "fb_{$userID}@facebook.com";

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR (oauth_provider = ? AND oauth_id = ?)");
        $stmt->execute([$userEmail, 'facebook', $userID]);
        $user = $stmt->fetch();

        if ($user) {
            if (!$user['oauth_provider']) {
                $pdo->prepare("UPDATE users SET oauth_provider = ?, oauth_id = ?, email = ? WHERE id = ?")
                    ->execute(['facebook', $userID, $userEmail, $user['id']]);
            }
        } else {
            $userId = 'user_' . round(microtime(true) * 1000);
            $stmt = $pdo->prepare("INSERT INTO users (id, email, password_hash, role, first_name, last_name, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $userEmail, null, 'customer', $firstName, $lastName, 'facebook', $userID]);
            
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
        }

        $tokenPayload = ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'exp' => time() + 86400];
        $authToken = JWT::encode($tokenPayload);

        echo json_encode([
            'token' => $authToken,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name']
            ]
        ]);
    }
}
