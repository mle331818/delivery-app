<?php
/**
 * Simple zero-dependency JWT implementation in PHP.
 * Uses HMAC SHA256 for signing tokens.
 */
class JWT {
    private static $secret = 'your-secret-key-change-in-production'; // Keep this the same as Node.js for now

    /**
     * Encode a payload into a JWT
     */
    public static function encode($payload, $secret = null) {
        $key = $secret ?? self::$secret;
        
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode($payload);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payload);

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    /**
     * Decode and verify a JWT
     * Returns the payload object if valid, false if invalid or expired.
     */
    public static function decode($token, $secret = null) {
        $key = $secret ?? self::$secret;

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        list($base64UrlHeader, $base64UrlPayload, $base64UrlSignature) = $parts;

        // Verify Signature
        $signature = self::base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);

        if (!hash_equals($signature, $expectedSignature)) {
            return false;
        }

        // Verify Expiration if 'exp' claim is present
        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }

        return $payload;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }
}
