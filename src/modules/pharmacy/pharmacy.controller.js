const pharmacyService = require('./pharmacy.service');
const catchAsync = require('../../utils/catchAsync');

// ── API Endpoints ──

exports.apiGetCategories = catchAsync(async (req, res) => {
    const categories = await pharmacyService.getCategories();
    res.json({ success: true, categories });
});

exports.apiListProducts = catchAsync(async (req, res) => {
    const data = await pharmacyService.listProducts(req.query);
    res.json({ success: true, ...data });
});

exports.apiGetProduct = catchAsync(async (req, res) => {
    const data = await pharmacyService.getProduct(req.params.slug, req.user?.id);
    res.json({ success: true, ...data });
});

exports.apiAddToCart = catchAsync(async (req, res) => {
    const { productId, quantity } = req.validated.body;
    const result = await pharmacyService.addToCart(req.user.id, productId, quantity);
    res.json({ success: true, message: 'Added to cart', ...result });
});

exports.apiUpdateCart = catchAsync(async (req, res) => {
    const { productId, quantity } = req.validated.body;
    const result = await pharmacyService.updateCartItem(req.user.id, productId, quantity);
    res.json({ success: true, message: 'Cart updated', ...result });
});

exports.apiRemoveFromCart = catchAsync(async (req, res) => {
    const productId = parseInt(req.params.productId);
    const result = await pharmacyService.removeFromCart(req.user.id, productId);
    res.json({ success: true, message: 'Removed from cart', ...result });
});

exports.apiGetCart = catchAsync(async (req, res) => {
    const cart = await pharmacyService.getCart(req.user.id);
    res.json({ success: true, ...cart });
});

exports.apiPlaceOrder = catchAsync(async (req, res) => {
    const shippingInfo = req.validated.body;
    const order = await pharmacyService.placeOrder(req.user.id, shippingInfo);
    res.json({ success: true, message: 'Order placed successfully!', order });
});

exports.apiGetOrders = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const orders = await pharmacyService.getOrders(req.user.id, page);
    res.json({ success: true, orders });
});

exports.apiGetOrderDetail = catchAsync(async (req, res) => {
    const order = await pharmacyService.getOrderDetail(parseInt(req.params.id), req.user.id);
    res.json({ success: true, order });
});

exports.apiSubmitReview = catchAsync(async (req, res) => {
    const { productId, rating, title, comment } = req.validated.body;
    const review = await pharmacyService.submitReview(req.user.id, productId, rating, title, comment);
    res.json({ success: true, message: 'Review submitted', review });
});

exports.apiGetReviews = catchAsync(async (req, res) => {
    const productId = parseInt(req.params.productId);
    const page = parseInt(req.query.page) || 1;
    const PharmacyModel = require('./pharmacy.model');
    const reviews = await PharmacyModel.getProductReviews(productId, page, 10);
    res.json({ success: true, reviews });
});

exports.apiToggleWishlist = catchAsync(async (req, res) => {
    const { productId } = req.validated.body;
    const result = await pharmacyService.toggleWishlist(req.user.id, productId);
    res.json({ success: true, ...result });
});

exports.apiGetWishlist = catchAsync(async (req, res) => {
    const wishlist = await pharmacyService.getWishlist(req.user.id);
    res.json({ success: true, wishlist });
});
