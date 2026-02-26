const express = require('express');
const router = express.Router();
const ctrl = require('./pharmacy.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const {
    addToCartSchema,
    updateCartSchema,
    placeOrderSchema,
    submitReviewSchema,
    toggleWishlistSchema
} = require('./pharmacy.schema');

// ── Page Routes (EJS) ──
router.get('/pharmacy',                      ctrl.renderShop);
router.get('/pharmacy/product/:slug',        ctrl.renderProduct);
router.get('/pharmacy/cart',    authenticate, authorize('user'), ctrl.renderCart);
router.get('/pharmacy/checkout',authenticate, authorize('user'), ctrl.renderCheckout);
router.get('/pharmacy/orders',  authenticate, authorize('user'), ctrl.renderOrders);
router.get('/pharmacy/orders/:id', authenticate, authorize('user'), ctrl.renderOrderDetail);
router.get('/pharmacy/wishlist',authenticate, authorize('user'), ctrl.renderWishlist);

// ── API: Public ──
router.get('/api/pharmacy/categories',       ctrl.apiGetCategories);
router.get('/api/pharmacy/products',         ctrl.apiListProducts);
router.get('/api/pharmacy/products/:slug',   ctrl.apiGetProduct);
router.get('/api/pharmacy/reviews/:productId', ctrl.apiGetReviews);

// ── API: Authenticated (Patient / user only) ──
router.post('/api/pharmacy/cart/add',
    authenticate, authorize('user'),
    validate(addToCartSchema),
    ctrl.apiAddToCart
);
router.put('/api/pharmacy/cart/update',
    authenticate, authorize('user'),
    validate(updateCartSchema),
    ctrl.apiUpdateCart
);
router.delete('/api/pharmacy/cart/remove/:productId',
    authenticate, authorize('user'),
    ctrl.apiRemoveFromCart
);
router.get('/api/pharmacy/cart',
    authenticate, authorize('user'),
    ctrl.apiGetCart
);

router.post('/api/pharmacy/orders',
    authenticate, authorize('user'),
    validate(placeOrderSchema),
    ctrl.apiPlaceOrder
);
router.get('/api/pharmacy/orders',
    authenticate, authorize('user'),
    ctrl.apiGetOrders
);
router.get('/api/pharmacy/orders/:id',
    authenticate, authorize('user'),
    ctrl.apiGetOrderDetail
);

router.post('/api/pharmacy/reviews',
    authenticate, authorize('user'),
    validate(submitReviewSchema),
    ctrl.apiSubmitReview
);

router.post('/api/pharmacy/wishlist/toggle',
    authenticate, authorize('user'),
    validate(toggleWishlistSchema),
    ctrl.apiToggleWishlist
);
router.get('/api/pharmacy/wishlist',
    authenticate, authorize('user'),
    ctrl.apiGetWishlist
);

module.exports = router;
