require('dotenv').config();

// Load the compiled jwt module
const jwtUtils = require('./dist/utils/jwt');

console.log('JWT Module exports:');
console.log(Object.keys(jwtUtils));

console.log('\n✅ Testing signAccessToken...');
try {
  const token = jwtUtils.signAccessToken({ 
    userId: '123', 
    email: 'test@example.com', 
    role: 'admin' 
  });
  console.log(`Generated token: ${token.substring(0, 50)}...`);
  
  const decoded = jwtUtils.verifyAccessToken(token);
  console.log(`Decoded: ${JSON.stringify(decoded)}`);
  console.log('✅ Access token works!');
} catch (err) {
  console.error('❌ Error with access token:', err.message);
}

console.log('\n✅ Testing signRefreshToken...');
try {
  const token = jwtUtils.signRefreshToken({ userId: '123' });
  console.log(`Generated token: ${token.substring(0, 50)}...`);
  
  const decoded = jwtUtils.verifyRefreshToken(token);
  console.log(`Decoded: ${JSON.stringify(decoded)}`);
  console.log('✅ Refresh token works!');
} catch (err) {
  console.error('❌ Error with refresh token:', err.message);
}

console.log('\n✅ Testing hashToken...');
try {
  const hash = jwtUtils.hashToken('test-token-value');
  console.log(`Hash: ${hash}`);
  console.log('✅ Token hashing works!');
} catch (err) {
  console.error('❌ Error with token hash:', err.message);
}
