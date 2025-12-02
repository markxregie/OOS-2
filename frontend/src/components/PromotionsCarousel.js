import React, { useState, useEffect } from 'react';
import { Carousel } from 'react-bootstrap';
import './PromotionsCarousel.css';

// API Base URL for Promotion Service
const PROMOTION_API_BASE = 'http://localhost:7010';

const fetchActivePromotions = async () => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/promotions`);
    if (!response.ok) throw new Error('Failed to fetch promotions');
    const data = await response.json();
    return data.promotions || [];
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    return [];
  }
};

const PromotionsCarousel = () => {
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    const loadPromotions = async () => {
      const activePromos = await fetchActivePromotions();
      setPromotions(activePromos);
    };
    loadPromotions();
  }, []);

  if (promotions.length === 0) {
    return null; // Don't render anything if there are no promotions
  }

  return (
    <Carousel interval={3000} pause="hover">
      {promotions.map((promo) => (
        <Carousel.Item key={promo.id}>
          <img className="d-block w-100" src={promo.image} alt={promo.title} />
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

export default PromotionsCarousel;