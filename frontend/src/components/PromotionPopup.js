import React, { useState, useEffect } from 'react';
import { Modal, Carousel, Button } from 'react-bootstrap';
import './PromotionPopup.css';

// API Base URL for Promotion Service
const PROMOTION_API_BASE = 'http://localhost:7010';

const fetchActivePromotions = async () => {
  try {
    const response = await fetch(`${PROMOTION_API_BASE}/promotions`);
    if (!response.ok) {
      throw new Error('Failed to fetch promotions');
    }
    const data = await response.json();
    return data.promotions || [];
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    return [];
  }
};

const PromotionPopup = () => {
  const [promotions, setPromotions] = useState([]);
  const [show, setShow] = useState(false);

  const handleClose = () => {
    setShow(false);
  };

  useEffect(() => {
    const loadPromotions = async () => {
      const activePromos = await fetchActivePromotions();
      if (activePromos.length > 0) {
        setPromotions(activePromos);
        setShow(true);
      }
    };
    loadPromotions();
  }, []);

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" dialogClassName="promotion-modal">
      <Modal.Body className="p-0">
        <Carousel interval={5000} pause="hover">
          {promotions.map((promo) => (
            <Carousel.Item key={promo.id}>
              <img className="d-block w-100" src={promo.image} alt={promo.title} />
            </Carousel.Item>
          ))}
        </Carousel>
      </Modal.Body>
    </Modal>
  );
};

export default PromotionPopup;