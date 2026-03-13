import React, { useState } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={styles.searchContainer}>
      <Search className={styles.searchIcon} size={20} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder="SEARCH DATABASE..."
        value={query}
        onChange={handleChange}
      />
    </div>
  );
};

export default SearchBar;
