const pharmacyService = require('./pharmacy.service');
const catchAsync = require('../../utils/catchAsync');

// ── Page Renderers ──

exports.renderShop = catchAsync(async (req, res) => {
    const categories = await pharmacyService.getCategories();
    let cartCount = 0;
    if (req.user) {
        const cart = await pharmacyService.getCart(req.user.id);
        cartCount = cart.itemCount;
    }
    res.render('pharmacy', { categories, cartCount, user: req.user || null });
});

exports.renderProduct = catchAsync(async (req, res) => {
    const data = await pharmacyService.getProduct(req.params.slug, req.user?.id);
    let cartCount = 0;
    if (req.user) {
        const cart = await pharmacyService.getCart(req.user.id);
        cartCount = cart.itemCount;
    }
    res.render('pharmacy_product', { ...data, cartCount, user: req.user || null });
});

exports.renderCart = catchAsync(async (req, res) => {
    const cart = await pharmacyService.getCart(req.user.id);
    res.render('pharmacy_cart', { ...cart, user: req.user });
});

exports.renderCheckout = catchAsync(async (req, res) => {
    const cart = await pharmacyService.getCart(req.user.id);
    if (cart.items.length === 0) return res.redirect('/pharmacy/cart');
    const shippingFee = cart.subtotal >= 500 ? 0 : 49;
    res.render('pharmacy_checkout', { ...cart, shippingFee, user: req.user });
});

exports.renderOrders = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const orders = await pharmacyService.getOrders(req.user.id, page);
    res.render('pharmacy_orders', { orders, page, user: req.user });
});

exports.renderOrderDetail = catchAsync(async (req, res) => {
    const order = await pharmacyService.getOrderDetail(parseInt(req.params.id), req.user.id);
    res.render('pharmacy_order_detail', { order, user: req.user });
});

exports.renderWishlist = catchAsync(async (req, res) => {
    const wishlist = await pharmacyService.getWishlist(req.user.id);
    let cartCount = 0;
    const cart = await pharmacyService.getCart(req.user.id);
    cartCount = cart.itemCount;
    res.render('pharmacy_wishlist', { wishlist, cartCount, user: req.user });
});

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
