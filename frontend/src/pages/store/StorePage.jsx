import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ArrowRightLeft, Sparkles, Check, Info, Coins, DollarSign } from 'lucide-react';

const COIN_PACKS = [
  { id: 'c1', name: 'Pile of Coins', coins: 150, bonus: 0, price: '$1.99', popular: false, icon: '🪙' },
  { id: 'c2', name: 'Bag of Coins', coins: 500, bonus: 50, price: '$4.99', popular: true, icon: '💰' },
  { id: 'c3', name: 'Chest of Coins', coins: 1200, bonus: 200, price: '$9.99', popular: false, icon: '📦' },
  { id: 'c4', name: 'Mansion Vault', coins: 3000, bonus: 800, price: '$24.99', popular: false, icon: '🏛️' },
];

const CASH_PACKS = [
  { id: 'cs1', name: 'Street Fund', cash: 1000, cost: 100, icon: '💵' },
  { id: 'cs2', name: 'Safehouse Stash', cash: 5000, cost: 400, discount: 20, icon: '💼' },
  { id: 'cs3', name: 'Bank Vault Share', cash: 15000, cost: 1000, discount: 33, icon: '🏦' },
];

export default function StorePage() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'coins' | 'cash'
  const [successTx, setSuccessTx] = useState(null);

  const handlePurchase = (packName, currency) => {
    setSuccessTx({ packName, currency });
    setTimeout(() => setSuccessTx(null), 3000);
  };

  return (
    <div className="page-scroll" style={{
      width: '100%', height: '100%',
      padding: '24px 40px 100px 40px',
      color: '#fff',
      display: 'flex', flexDirection: 'column', gap: 24,
      position: 'relative',
    }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {successTx && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, background: 'rgba(90,200,100,0.95)', color: '#fff',
              padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13,
              boxShadow: '0 0 20px rgba(90,200,100,0.5)', border: '1px solid #5ad15a',
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Check size={16} /> Successfully acquired {successTx.packName}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.12em', color: '#ff4455' }}>
          MANSION STORE
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top up your account balances to purchase rare roles, skins, and active powerups</span>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          onClick={() => setActiveTab('all')}
          className="btn-secondary"
          style={{
            borderColor: activeTab === 'all' ? '#ff3344' : 'rgba(255,255,255,0.06)',
            background: activeTab === 'all' ? 'rgba(255,20,40,0.1)' : 'rgba(10,5,18,0.8)',
            color: activeTab === 'all' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700
          }}
        >
          ALL OFFERS
        </button>
        <button 
          onClick={() => setActiveTab('coins')}
          className="btn-secondary"
          style={{
            borderColor: activeTab === 'coins' ? '#ffd700' : 'rgba(255,255,255,0.06)',
            background: activeTab === 'coins' ? 'rgba(255,215,0,0.1)' : 'rgba(10,5,18,0.8)',
            color: activeTab === 'coins' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700
          }}
        >
          🪙 BUY COINS
        </button>
        <button 
          onClick={() => setActiveTab('cash')}
          className="btn-secondary"
          style={{
            borderColor: activeTab === 'cash' ? '#8fcc55' : 'rgba(255,255,255,0.06)',
            background: activeTab === 'cash' ? 'rgba(143,204,85,0.1)' : 'rgba(10,5,18,0.8)',
            color: activeTab === 'cash' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700
          }}
        >
          💵 EXCHANGE CASH
        </button>
      </div>

      {/* Grid Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* 1. BUY COINS SECTION */}
        {(activeTab === 'all' || activeTab === 'coins') && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 18,
              letterSpacing: '0.08em', color: '#ffd700',
              display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid rgba(255,215,0,0.15)',
              paddingBottom: 8
            }}>
              <Coins size={20} /> PURCHASE GOLD COINS
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 20
            }}>
              {COIN_PACKS.map((pack) => (
                <motion.div
                  key={pack.id}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="glass-panel"
                  style={{
                    padding: 24, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,215,0,0.01)',
                    border: pack.popular ? '1.8px solid #ffd700' : '1px solid rgba(255,215,0,0.15)',
                    borderRadius: 12, textAlign: 'center', gap: 14,
                    position: 'relative',
                  }}
                >
                  {pack.popular && (
                    <div style={{
                      position: 'absolute', top: -10,
                      background: '#ffd700', color: '#000',
                      fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
                      padding: '2px 10px', borderRadius: 10,
                      boxShadow: '0 0 10px rgba(255,215,0,0.5)',
                    }}>
                      MOST POPULAR
                    </div>
                  )}

                  <span style={{ fontSize: 44, filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.4))' }}>{pack.icon}</span>
                  
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{pack.name}</h4>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#ffd700', display: 'block', marginTop: 4 }}>
                      🪙 {pack.coins}
                    </span>
                    {pack.bonus > 0 && (
                      <span style={{ fontSize: 10.5, color: '#5ad15a', fontWeight: 700, display: 'block', marginTop: 2 }}>
                        +{pack.bonus} BONUS COINS
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => handlePurchase(pack.name, 'coins')}
                    className="btn-primary" 
                    style={{
                      width: '100%', padding: '10px 16px', fontSize: 13,
                      border: '1.5px solid #ffd700', color: '#ffd700',
                      boxShadow: '0 0 14px rgba(255,215,0,0.15)',
                      background: 'rgba(25,20,5,0.7)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,215,0,0.15)'; e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(25,20,5,0.7)'; e.currentTarget.style.color='#ffd700'; }}
                  >
                    <CreditCard size={14} /> BUY FOR {pack.price}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 2. EXCHANGE FOR CASH SECTION */}
        {(activeTab === 'all' || activeTab === 'cash') && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 18,
              letterSpacing: '0.08em', color: '#8fcc55',
              display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid rgba(143,204,85,0.15)',
              paddingBottom: 8
            }}>
              <ArrowRightLeft size={20} /> EXCHANGE COINS FOR CASH
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20
            }}>
              {CASH_PACKS.map((pack) => (
                <motion.div
                  key={pack.id}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="glass-panel"
                  style={{
                    padding: 24, display: 'flex', gap: 16,
                    background: 'rgba(143,204,85,0.01)',
                    border: '1px solid rgba(143,204,85,0.15)',
                    borderRadius: 12, alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 36, filter: 'drop-shadow(0 0 10px rgba(143,204,85,0.3))' }}>{pack.icon}</span>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{pack.name}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#8fcc55' }}>
                      💵 ${pack.cash.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Cost: <strong style={{ color: '#ffd700' }}>🪙 {pack.cost}</strong>
                    </span>
                    {pack.discount && (
                      <span style={{
                        position: 'absolute', top: 10, right: 10,
                        background: '#8fcc55', color: '#000',
                        fontSize: 8.5, fontWeight: 900, padding: '2px 8px', borderRadius: 4
                      }}>
                        SAVE {pack.discount}%
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchase(pack.name, 'cash')}
                    className="btn-secondary"
                    style={{
                      padding: '8px 12px', fontSize: 11.5,
                      borderColor: 'rgba(143,204,85,0.4)', color: '#8fcc55',
                      background: 'rgba(10,20,10,0.5)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(143,204,85,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(10,20,10,0.5)'; }}
                  >
                    EXCHANGE
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 3. STORE INFORMATION BOX */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel"
          style={{
            padding: 20, display: 'flex', gap: 16,
            background: 'rgba(10,5,15,0.85)',
            border: '1.5px solid rgba(120,40,60,0.25)',
            alignItems: 'flex-start',
          }}
        >
          <Info size={20} color="#ff3344" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>CURRENCY REGULATION COMPLIANCE</span>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: '1.5' }}>
              All gold coin purchases are final. Coins are only usable in-game for cosmetics, VIP lobby triggers, and loot boxes. 
              In-game Cash is earned exclusively via matches or converted from Gold Coins, and cannot be redeemed for real-world currency.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
