/**
 * Global error handler middleware
 */
export function errorHandler(error, req, res, next) {
    console.error('Error:', error);
    res.status(500).json({
        error: error.message || 'Internal server error'
    });
}
