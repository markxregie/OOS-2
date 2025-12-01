import React from 'react';
import Home from './Home';
import About from './aboutus';
import Menulanding from './menulanding';
import Services from './services';
import PromotionPopup from './PromotionPopup';

const ContactUs = () => {
  return (
    <section id="contact" style={{ padding: '2rem', backgroundColor: '#f8f9fa' }}>
      <h2>Contact Us</h2>
      <p>Please reach out to us via email or phone. We would love to hear from you!</p>
      {/* Add contact form or contact details here */}
    </section>
  );
};

const HomePage = () => {
  return (
    <div>
      <PromotionPopup />
      <Home />
      <Menulanding />
      <About />
      <Services />
    </div>
  );
};

export default HomePage;
