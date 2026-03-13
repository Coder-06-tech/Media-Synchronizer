import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProfileCard from './ProfileCard';
import styles from './CarouselCards.module.css';

const CarouselCards = ({ people }) => {
  const [items, setItems] = useState(people);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Sync internal items state if parent people prop changes via search
  useEffect(() => {
    setItems(people);
  }, [people]);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, items]);

  const handleNext = () => {
    if (items.length <= 1) return;
    setItems(prevItems => {
      const newArray = [...prevItems];
      const first = newArray.shift();
      newArray.push(first);
      return newArray;
    });
  };

  const handlePrev = () => {
    if (items.length <= 1) return;
    setItems(prevItems => {
      const newArray = [...prevItems];
      const last = newArray.pop();
      newArray.unshift(last);
      return newArray;
    });
  };

  // Pause autoplay when interacting with controls
  const handleInteractionStart = () => setIsAutoPlaying(false);
  const handleInteractionEnd = () => setIsAutoPlaying(true);

  if (!items || items.length === 0) return null;

  return (
    <div 
      className={styles.carouselWrapper}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
    >
      <button 
        className={`${styles.navButton} ${styles.prevButton}`} 
        onClick={handlePrev}
        aria-label="Previous profile"
      >
        <ChevronLeft size={40} />
      </button>

      <div className={styles.carouselContainer}>
        <AnimatePresence mode="popLayout">
          {items.map((person, index) => {
            const centerIndex = Math.floor(items.length / 2);
            const isCenter = index === centerIndex;
            const distance = Math.abs(index - centerIndex);
            
            const scale = isCenter ? 1 : distance === 1 ? 0.85 : 0.7;
            const opacity = isCenter ? 1 : distance === 1 ? 0.4 : 0; // Fade out non-center cards
            const zIndex = 10 - distance;
            const isVisible = distance <= 2;

            return (
              <motion.div
                key={person._id || person.id}
                layout
                initial={false}
                animate={{ 
                  scale: scale,
                  opacity: opacity,
                  zIndex: zIndex
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  mass: 1
                }}
                className={styles.cardWrapper}
                style={{
                  pointerEvents: isVisible && isCenter ? 'auto' : 'none',
                  filter: isCenter ? 'none' : 'blur(2px)' 
                }}
              >
                <ProfileCard user={person} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button 
        className={`${styles.navButton} ${styles.nextButton}`} 
        onClick={handleNext}
        aria-label="Next profile"
      >
        <ChevronRight size={40} />
      </button>
    </div>
  );
};

export default CarouselCards;
