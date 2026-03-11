<?php
/**
 * Authentication and Authorization helpers for the PHP backend.
 */
require_once __DIR__ . '/jwt.php';

class Auth {
    /**
     * Extracts token from Authorization header and decodes it.
     * Returns the user payload array if valid, false otherwise.
     */
    public static function authenticateToken() {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }

        if (empty($headers)) {
            return false;
        }

        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            $token = $matches[1];
            return JWT::decode($token);
        }

        return false;
    }

    /**
     * Checks if the user has one of the specified roles.
     * If not, it automatically sends a 403 response and stops execution.
     */
    public static function requireRoles($roles) {
        $user = self::authenticateToken();
        
        if (!$user) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }

        if (!in_array($user['role'], $roles)) {
            header('Content-Type: application/json');
            http_response_code(403);
            echo json_encode(['error' => 'Insufficient permissions required']);
            exit;
        }

        return $user;
    }
    
    // Convenience methods
    public static function requireKitchenRole() {
        return self::requireRoles(['kitchen', 'admin']);
    }

    public static function requireAdminRole() {
        return self::requireRoles(['admin']);
    }

    public static function requireDeliveryRole() {
        return self::requireRoles(['delivery']);
    }
}
