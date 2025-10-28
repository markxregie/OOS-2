import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import "bootstrap-icons/font/bootstrap-icons.css";
import logo from '../assets/png.png';
import './footer.css';

const Footer = () => {
  return (
<footer className="footer-custom py-3 mt-5">
      <Container>
        <Row className="align-items-center">
          {/* Logo Column - Image Only */}
          <Col md={3} className="mb-3 mb-md-0">
            <div className="logo-container">
              <img 
                src={logo} 
                alt="Bleu Bean Cafe Logo" 
                className="img-fluid"
                style={{ maxHeight: '140px', width: 'auto' }}
              />
            </div>
          </Col>

          {/* Horizontal Sections Container */}
          <Col md={9}>
            <Row>
              {/* Follow Us Column */}
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-3 text-custom">Follow Us</h5>
                <div className="social-icons">
                  <a href="https://www.facebook.com/bleubeancafe.ph" className="text-custom me-3" target="_blank" rel="noopener noreferrer">
                    <i className="bi bi-facebook"></i>
                  </a>
                  <a href="https://www.instagram.com/bleubeancafe.ph?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" className="text-custom me-3" target="_blank" rel="noopener noreferrer">
                    <i className="bi bi-instagram"></i>
                  </a>
                  <a href="https://tiktok.com/@bleu.bean.cafe" className="text-custom me-3" target="_blank" rel="noopener noreferrer">
                    <i className="bi bi-tiktok"></i>
                  </a>
                </div>
              </Col>

              {/* Contact Column */}
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-3 text-custom text-start">Contact</h5>
                <p className="mb-1 text-custom text-start">
                  <i className="bi bi-geo-alt-fill me-2"></i> #213 Don Fabian Street Brgy Commonwealth, Quezon City, Philippines
                </p>
                <p className="mb-1 text-custom text-start">
                  <i className="bi bi-telephone-fill me-2"></i> 0961 687 2463
                </p>
                <p className="mb-0 text-custom text-start d-flex align-items-center">
                  <i className="bi bi-envelope-fill me-2"></i> bleubeancafe.ph@gmail.com
                </p>
              </Col>


              {/* Hours Column */}
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-3 text-custom text-start">Hours</h5>
                <p className="mb-1 text-custom text-start">Mon-Fri: 7am - 9pm</p>
                <p className="mb-1 text-custom text-start">Sat-Sun: 8am - 10pm</p>
              </Col>

              {/* Concerns Column */}
              <Col md={3} className="mb-3 mb-md-0">
                <h5 className="mb-3 text-custom text-start">Concerns</h5>
                <p className="mb-1 text-custom text-start">
                  <Link to="/concerns" className="text-custom">Submit Concerns</Link>
                </p>
              </Col>

            </Row>
          </Col>
        </Row>

        {/* Copyright Row */}
        <Row>
          <Col className="text-center mt-3">
            <p className="mb-0 small text-custom">
              © {new Date().getFullYear()} Bleu Bean Cafe. All Rights Reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;