import { useState, useEffect } from 'react'
import axios from 'axios'
import './Menu.css'

function Menu({ addToCart }) {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState([])
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  useEffect(() => {
    Promise.all([
      axios.get('/api/menu/categories'),
      axios.get('/api/menu/items'),
      // Only fetch favorites if logged in (token exists)
      localStorage.getItem('token') ? axios.get('/api/favorites') : Promise.resolve({ data: [] })
    ]).then(([catRes, itemsRes, favRes]) => {
      setCategories(Array.isArray(catRes.data) ? catRes.data : [])
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : [])

      const favs = (favRes && Array.isArray(favRes.data)) ? favRes.data : []
      setFavorites(favs.map(f => f?.id).filter(id => id))

      setLoading(false)
    }).catch(err => {
      console.error('Error loading menu:', err)
      // Fallback to empty to avoid crash
      setCategories([])
      setItems([])
      setFavorites([])
      setLoading(false)
    })
  }, [])

  const toggleFavorite = async (e, itemId) => {
    e.stopPropagation();
    if (!localStorage.getItem('token')) {
      alert('Please login to save favorites');
      return;
    }

    const isFav = favorites.includes(itemId);
    try {
      if (isFav) {
        await axios.delete(`/api/favorites/${itemId}`);
        setFavorites(prev => prev.filter(id => id !== itemId));
      } else {
        await axios.post(`/api/favorites/${itemId}`);
        setFavorites(prev => [...prev, itemId]);
      }
    } catch (err) {
      console.error('Error toggling favorite');
    }
  }

  const filteredItems = items.filter(item => {
    if (showFavoritesOnly) return favorites.includes(item.id);
    if (selectedCategory) return item.category_id === selectedCategory;
    return true;
  })

  if (loading) {
    return <div className="loading">Loading menu...</div>
  }

  return (
    <div className="menu-page">
      <h2>Our Menu</h2>

      <div className="category-tabs">
        <button
          className={!selectedCategory && !showFavoritesOnly ? 'active' : ''}
          onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); }}
        >
          All Items
        </button>
        <button
          className={showFavoritesOnly ? 'active' : ''}
          onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(true); }}
        >
          ❤️ Favorites
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={selectedCategory === cat.id ? 'active' : ''}
            onClick={() => { setSelectedCategory(cat.id); setShowFavoritesOnly(false); }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="menu-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="menu-item-card">
            <div className="menu-item-image">
              <button
                className={`btn-fav ${favorites.includes(item.id) ? 'active' : ''}`}
                onClick={(e) => toggleFavorite(e, item.id)}
                title={favorites.includes(item.id) ? "Remove from favorites" : "Add to favorites"}
              >
                {favorites.includes(item.id) ? '❤️' : '🤍'}
              </button>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} />
              ) : (
                <div className="placeholder-image">🍣</div>
              )}
            </div>
            <div className="menu-item-info">
              <h3>{item.name}</h3>
              <p className="description">{item.description}</p>
              <div className="menu-item-footer">
                <span className="price">${item.price.toFixed(2)}</span>
                <button
                  className="btn btn-primary"
                  onClick={() => addToCart(item)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <p className="no-items">No items found.</p>
      )}
    </div>
  )
}

export default Menu



