<?php
/**
 * Main API Router
 * Handles CORS and routes requests to the appropriate controllers.
 */

// Basic error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Handle CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle Preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Always return JSON
header('Content-Type: application/json');

// Get the requested URI (e.g., /api/auth/login)
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// For testing locally with built-in PHP server, strip the base directory if needed
// Assuming URL is always prefixed with /api/
$apiPrefix = '/api/';
$route = '';

if (strpos($requestUri, $apiPrefix) !== false) {
    $route = substr($requestUri, strpos($requestUri, $apiPrefix) + strlen($apiPrefix));
} else {
    // If not prefixed with /api/, just take the whole path 
    // (useful if .htaccess rewrites /api/ to just /)
    $route = ltrim($requestUri, '/');
}

// Remove trailing slash
$route = rtrim($route, '/');

// Parse route parts (e.g. auth/login -> ['auth', 'login'])
$routeParts = explode('/', $route);
$controllerName = $routeParts[0] ?? '';

// Load core dependencies
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Route to appropriate controller
try {
    switch ($controllerName) {
        case 'auth':
            require_once __DIR__ . '/controllers/AuthController.php';
            AuthController::handle($routeParts);
            break;
            
        case 'menu':
            require_once __DIR__ . '/controllers/MenuController.php';
            MenuController::handle($routeParts);
            break;
            
        case 'orders':
        case 'favorites':
        case 'promos':
            require_once __DIR__ . '/controllers/OrderController.php';
            OrderController::handle($routeParts);
            break;
            
        case 'admin':
            require_once __DIR__ . '/controllers/AdminController.php';
            AdminController::handle($routeParts);
            break;
            
        case 'kitchen':
            require_once __DIR__ . '/controllers/KitchenController.php';
            KitchenController::handle($routeParts);
            break;
            
        case 'delivery':
            require_once __DIR__ . '/controllers/DeliveryController.php';
            DeliveryController::handle($routeParts);
            break;
            
        case '':
            echo json_encode(['message' => 'Sushi Delivery API is running']);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal Server Error', 'details' => $e->getMessage()]);
}

/**
 * Utility function to get JSON body from POST/PATCH requests
 */
function getJsonBody() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?: [];
}
