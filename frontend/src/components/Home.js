import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import coffeeImage from '../assets/home.png'; // adjust path if needed
import arrowIcon from '../assets/arrow.svg';
import wave from '../assets/Wave.svg';


const Home = () => {
  const navigate = useNavigate();

  const handleOrderClick = () => {
    navigate('/menu');
  };

  return (
    <section className="home-section" id="home">
      <div className="home-content">
        <div className="home-text">
          <h1>
            <span className="highlight">Feeling Blue?</span>
          </h1>
          <p>It's Time To Take Your Coffee</p>
          <button className="order-btn" onClick={handleOrderClick}>
              Order Now! <img src={arrowIcon} alt="Arrow Icon" className="arrow-icon" />
            </button>

        </div>
        <div className="home-image">
          <img src={coffeeImage} alt="Iced Coffee" />
        </div>
      </div>

      <img src={wave} alt="Wave design" className="wave-img" />
    </section>
  );
};

export default Home;
