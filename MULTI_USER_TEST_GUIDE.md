# Multi-User Testing Guide

## 🧪 Testing User-Scoped Architecture

This guide helps you test the new user-scoped architecture to ensure each user has their own isolated experience.

## ⚡ Quick Test Setup

### 1. Start the Updated Server
```bash
node start-user-scoped-server.js
```

### 2. Start the Frontend
```bash
npm run dev
```

### 3. Create Test Accounts
Go to your Clerk dashboard and create 2-3 test user accounts, or use the sign-up flow.

## 🔬 Test Scenarios

### Test 1: Basic User Isolation
**Goal**: Verify users see their own data

**Steps**:
1. Open **Browser Window 1** → Navigate to `http://localhost:3000`
2. Sign in as **User A**
3. Note the default stocks (BNOX, GOOGL, MSFT) with their prices
4. Open **Browser Window 2** (or incognito) → Navigate to `http://localhost:3000`  
5. Sign in as **User B**
6. Note User B also sees default stocks but with **different prices**

**✅ Expected Result**: 
- Both users see the same stock symbols
- Stock prices are different for each user
- Each user has their own portfolio instance

### Test 2: Control Panel Access
**Goal**: Ensure all users can access control panel

**Steps**:
1. As **User A**: Click "Control Panel" in the navigation
2. Verify you can access `/remote` without admin restrictions
3. As **User B**: Click "Control Panel" in the navigation  
4. Verify you can also access `/remote`

**✅ Expected Result**:
- Both users can access the control panel
- No "Access Denied" messages
- Equal functionality for all users

### Test 3: Independent Controls
**Goal**: Verify control changes don't affect other users

**Steps**:
1. **User A**: In Control Panel → Set volatility to 5.0% (max)
2. **User A**: Pause the system
3. **User B**: Check their Control Panel
4. **User B**: Set volatility to 0.1% (min) 
5. **User B**: Keep system running
6. Wait 10-15 seconds and observe price changes

**✅ Expected Result**:
- User A's stocks are paused (no price updates)
- User B's stocks continue updating with low volatility
- Settings are independent for each user

### Test 4: Portfolio Management
**Goal**: Test isolated portfolio operations

**Steps**:
1. **User A**: Add a new stock (e.g., "TSLA", "Tesla Inc.", $250.00)
2. **User A**: Edit GOOGL price to $200.00
3. **User B**: Check their portfolio
4. **User B**: Add a different stock (e.g., "AMZN", "Amazon", $180.00)
5. **User B**: Delete MSFT from their portfolio

**✅ Expected Result**:
- User A's changes don't appear in User B's portfolio
- User B's changes don't appear in User A's portfolio  
- Each user maintains independent stock collections

### Test 5: Bulk Operations
**Goal**: Ensure bulk updates are user-scoped

**Steps**:
1. **User A**: Use "Bull Market (+)" bulk operation
2. **User B**: Immediately check their stock prices
3. **User B**: Use "Bear Market (-)" bulk operation  
4. **User A**: Check their stock prices

**✅ Expected Result**:
- User A's bull market increase doesn't affect User B
- User B's bear market decrease doesn't affect User A
- Operations are completely isolated

### Test 6: Session Reset
**Goal**: Test personal session reset functionality

**Steps**:
1. **User A**: Make several changes (add stocks, change settings)
2. **User A**: Click "RESET MY SESSION"
3. **User A**: Confirm the reset
4. **User B**: Continue using their session normally

**✅ Expected Result**:
- User A gets fresh default data (original 3 stocks, default settings)
- User B's session is unaffected
- Only the user who triggered reset is affected

### Test 7: Concurrent Usage
**Goal**: Test simultaneous user interactions

**Steps**:
1. Have both users actively use the app simultaneously:
   - **User A**: Continuously adjust volatility slider
   - **User B**: Add and remove stocks
2. Watch for 1-2 minutes of concurrent activity
3. Check for any cross-contamination or errors

**✅ Expected Result**:
- No errors or crashes
- Each user's actions only affect their own session
- Performance remains stable with multiple users

## 🎯 Advanced Tests

### Test 8: Multiple Tabs Per User
**Steps**:
1. **User A**: Open 2 tabs with the same account
2. Make changes in Tab 1, verify they appear in Tab 2
3. Ensure other users still see their own data

### Test 9: Sign Out / Sign In
**Steps**:
1. **User A**: Make portfolio changes
2. Sign out and sign back in
3. Verify data persistence during session
4. Note: Data will reset when server restarts (by design)

### Test 10: API Health Check
**Steps**:
1. Open browser console and run:
```javascript
fetch('/api/health').then(r => r.json()).then(console.log)
```
2. Check `userSessions` count matches active users

## 🚨 Red Flags (Things That Should NOT Happen)

- ❌ User A sees User B's stock additions
- ❌ User A's pause affects User B's price updates  
- ❌ User B gets "Access Denied" for control panel
- ❌ Bulk operations affect multiple users
- ❌ Session reset affects other users
- ❌ Server errors with multiple concurrent users

## 📊 Test Results Template

```markdown
## Test Results - [Date]

### Environment
- Server: ✅/❌ server-clerk-updated.js running
- Frontend: ✅/❌ http://localhost:3000 accessible
- Clerk Auth: ✅/❌ Authentication working

### Test 1: Basic User Isolation
- User A Data Isolated: ✅/❌
- User B Data Isolated: ✅/❌  
- Different Stock Prices: ✅/❌

### Test 2: Control Panel Access
- User A Access: ✅/❌
- User B Access: ✅/❌
- No Admin Restrictions: ✅/❌

### Test 3: Independent Controls
- Volatility Settings Isolated: ✅/❌
- Pause/Resume Isolated: ✅/❌
- Price Updates Independent: ✅/❌

### Test 4: Portfolio Management  
- Add Stock Isolated: ✅/❌
- Edit Price Isolated: ✅/❌
- Delete Stock Isolated: ✅/❌

### Test 5: Bulk Operations
- Bull Market Isolated: ✅/❌
- Bear Market Isolated: ✅/❌

### Test 6: Session Reset
- User Reset Isolated: ✅/❌
- Other Users Unaffected: ✅/❌

### Test 7: Concurrent Usage
- No Cross-Contamination: ✅/❌
- Performance Stable: ✅/❌
- No Errors: ✅/❌

### Notes
[Any observations or issues found]
```

## 💡 Tips for Testing

1. **Use Incognito/Private Windows** for different users to avoid cookie conflicts
2. **Clear Browser Storage** between tests if needed
3. **Monitor Server Logs** for errors during multi-user testing
4. **Test with Different Browsers** (Chrome, Firefox, Safari) for additional coverage
5. **Document Any Issues** with screenshots and reproduction steps

---

**🎯 Success Criteria**: All tests pass with complete data isolation and no cross-user interference!