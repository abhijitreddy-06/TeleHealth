-- ============================================================================
-- Pharmacy Categories Seed Data
-- Insert default pharmacy categories with display information
-- ============================================================================

INSERT INTO pharmacy_categories (id, name, slug, description, image_url, sort_order)
VALUES
  (1, 'Pain Relief', 'pain-relief',
   'Effective pain management solutions including analgesics, anti-inflammatory drugs, and topical treatments for headaches, muscle pain, and joint discomfort.',
   'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 1),

  (2, 'Fever & Cold', 'fever-cold',
   'Trusted remedies for fever, common cold, flu, and respiratory symptoms. Includes antipyretics, decongestants, and cough suppressants.',
   'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400', 2),

  (3, 'Diabetes Care', 'diabetes-care',
   'Comprehensive diabetes management products including glucose monitors, test strips, insulin supplies, and diabetic-friendly supplements.',
   'https://images.unsplash.com/photo-1593491034932-844ab981ed7c?w=400', 3),

  (4, 'Blood Pressure', 'blood-pressure',
   'Blood pressure monitoring equipment and cardiovascular health medications to help manage hypertension and support heart wellness.',
   'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400', 4),

  (5, 'Vitamins & Supplements', 'vitamins-supplements',
   'Essential vitamins, minerals, and dietary supplements to support overall health, immunity, and nutritional well-being for all ages.',
   'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400', 5),

  (6, 'Skin Care', 'skin-care',
   'Dermatologist-recommended skin care products including moisturizers, sunscreens, medicated creams, and treatments for common skin conditions.',
   'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 6),

  (7, 'Digestive Health', 'digestive-health',
   'Products for digestive wellness including antacids, probiotics, laxatives, and remedies for bloating, heartburn, and gastrointestinal discomfort.',
   'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400', 7),

  (8, 'Baby Care', 'baby-care',
   'Safe and gentle baby care essentials including infant-formulated medications, diaper rash creams, gripe water, and pediatric health products.',
   'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', 8),

  (9, 'Women''s Health', 'womens-health',
   'Specialized health products for women covering prenatal vitamins, menstrual care, hormonal balance, and reproductive wellness needs.',
   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', 9),

  (10, 'Medical Devices', 'medical-devices',
   'Reliable medical devices and equipment including thermometers, blood pressure monitors, nebulizers, and home diagnostic tools.',
   'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400', 10);
