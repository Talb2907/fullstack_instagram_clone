
// Global state
let currentUser = null;
let currentStories = [];
let currentSuggestions = [];
let currentPosts = [];
let userNotifications = [];
let notificationUnreadCount = 0;

// relative URLs to absolute URLs
function toAbs(url) {
  if (!url) return 'images/profile.jpg';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    return `http://localhost:5000${url}`;
  }
  if (url.startsWith('/')) {
    return `http://localhost:5000${url}`;
  }
  return `http://localhost:5000/${url}`;
}

function safeImageUrl(url) {
  try {
    const absoluteUrl = toAbs(url);
    const encodedUrl = encodeURI(absoluteUrl);
    console.log('Image URL conversion:', { original: url, absolute: absoluteUrl, encoded: encodedUrl });
    return encodedUrl;
  } catch (error) {
    console.warn('Error encoding image URL:', url, error);
    return toAbs(url);
  }
}


let globalStories = [];
let currentStoryIndex = -1;


let shouldShareToFacebook = false;
let facebookShareConfirmed = false;
let currentPostData = null;


let selectedMediaFile = null;

// Get token from localStorage 
function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("jwt_token");
}

async function fetchCurrentUser() {
  try {
    const token = getToken();
    if (!token) {
      console.log('No token found, cannot fetch current user');
      return null;
    }

    const response = await fetch('/api/users/me', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('=== FRONTEND: Fetched current user data ===');
      console.log('Raw response:', userData);
      console.log('User data:', userData.data);
      console.log('Username from DB:', userData.data.username);
      console.log('Location from DB:', userData.data.location);
      console.log('Avatar from DB:', userData.data.avatarUrl);
      console.log('User ID from DB:', userData.data._id);
      console.log('User ID type:', typeof userData.data._id);
      
      // Store user data globally , use the actual avatar from DB
      window.currentUser = {
        userId: String(userData.data._id || userData.data.id), 
        username: userData.data.username,
        avatarUrl: userData.data.avatarUrl, 
        location: userData.data.location, 
        following: userData.data.following || [] 
      };
      
      console.log('Updated window.currentUser:', window.currentUser);
      console.log('Following list from DB:', userData.data.following);
      
      
      updateAvatarDisplays();
      
      
      updateUsernameDisplay(userData.data.username);
      
      
      renderHeader(window.currentUser);
      
      return window.currentUser;
    } else {
      console.error('Failed to fetch current user:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

// Update avatar displays in both locations
function updateAvatarDisplays() {
  if (!window.currentUser) {
    console.log('No current user data, using fallback avatars');
    setFallbackAvatars();
    return;
  }

  const { username, avatarUrl } = window.currentUser;
  console.log('Updating avatars for user:', username, 'with URL:', avatarUrl);
  
  // Update sidebar avatar
  const sidebarProfilePic = document.getElementById('sidebarProfilePic');
  if (sidebarProfilePic) {
    sidebarProfilePic.src = avatarUrl;
    sidebarProfilePic.alt = username;
    
    // Add error handling for avatar loading
    sidebarProfilePic.onerror = function() {
      console.error('Failed to load sidebar avatar:', avatarUrl);
      this.src = 'images/profile.jpg';
      this.alt = username;
    };
    
    sidebarProfilePic.onload = function() {
      console.log('Successfully loaded sidebar avatar:', avatarUrl);
    };
    
    console.log('Updated sidebar avatar:', avatarUrl);
  }
  
  // Update suggestions avatar
  const suggestionsProfilePic = document.getElementById('suggestionsProfilePic');
  if (suggestionsProfilePic) {
    suggestionsProfilePic.src = avatarUrl;
    suggestionsProfilePic.alt = username;
    
    // Add error handling for avatar loading
    suggestionsProfilePic.onerror = function() {
      console.error('Failed to load suggestions avatar:', avatarUrl);
      this.src = 'images/profile.jpg';
      this.alt = username;
    };
    
    suggestionsProfilePic.onload = function() {
      console.log('Successfully loaded suggestions avatar:', avatarUrl);
    };
    
    console.log('Updated suggestions avatar:', avatarUrl);
  }
  
  // Update suggestions username
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  if (suggestionsUsername) {
    suggestionsUsername.textContent = username;
    console.log('Updated suggestions username:', username);
  }
  
  // Also update localStorage and current user object
  if (username) {
    localStorage.setItem('username', username);
    if (window.currentUser) {
      window.currentUser.username = username;
    }
    console.log('Updated localStorage and currentUser.username to:', username);
  }
  
  // Also update the header to ensure suggestions bar is updated
  renderHeader(window.currentUser);
}

// Set fallback avatars when no user data is available
function setFallbackAvatars() {
  const fallbackAvatar = 'images/profile.jpg';
  
  // Update sidebar avatar
  const sidebarProfilePic = document.getElementById('sidebarProfilePic');
  if (sidebarProfilePic) {
    sidebarProfilePic.src = fallbackAvatar;
    sidebarProfilePic.alt = 'משתמש';
    console.log('Set sidebar fallback avatar');
  }
  
  // Update suggestions avatar
  const suggestionsProfilePic = document.getElementById('suggestionsProfilePic');
  if (suggestionsProfilePic) {
    suggestionsProfilePic.src = fallbackAvatar;
    suggestionsProfilePic.alt = 'משתמש';
    console.log('Set suggestions fallback avatar');
  }
  
  // Update suggestions username
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  if (suggestionsUsername) {
    suggestionsUsername.textContent = 'מתחבר...';
    console.log('Set suggestions fallback username');
  }
}

// Clear current user data (for logout)
function clearCurrentUser() {
  window.currentUser = null;
  setFallbackAvatars();
  console.log('Cleared current user data');
}


function logout() {
  console.log('Logging out...');
  
  clearCurrentUser();
  
  // Clear authentication data
  localStorage.removeItem('token');
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('username');

  window.location.href = 'index.html';
}

// Function to refresh current user data
async function refreshCurrentUser() {
  console.log('Refreshing current user data...');
  try {
    await fetchCurrentUser();
    return 'Current user data refreshed successfully';
  } catch (error) {
    console.error('Failed to refresh current user data:', error);
    return 'Failed to refresh current user data';
  }
}

// Function to switch user 
function switchUser(username) {
  console.log('Switching to user:', username);
  
  clearCurrentUser();
  
  localStorage.setItem('username', username);
  
  updateUsernameDisplay(username);
  
  // Fetch new user data
  fetchCurrentUser().catch(error => {
    console.error('Failed to fetch new user data:', error);
    setFallbackAvatars();
  });
  
  return `Switched to user: ${username}`;
}

// extract username from JWT token
function extractUsernameFromToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      return payload.username || payload.name || null;
    }
  } catch (error) {
    console.warn('Could not extract username from token:', error);
  }
  return null;
}


// test backend connectivity
async function checkBackendHealth() {
  try {
    console.log('Checking backend health...');
    const response = await fetch('/api/health', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Backend is healthy');
      return true;
    } else {
      console.warn('Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend health check error:', error);
    return false;
  }
}

// Like toggle 
async function toggleLike(icon) {
  try {
    const postEl = icon.closest('.post-container');
    const postId = postEl?.dataset?.postId;
    if (!postId) return;

    const token = getToken();
    if (!token) {
      showToast('אנא התחבר כדי לעשות לייק', 'error');
      return;
    }

    const countSpan = icon.nextElementSibling;
    const wasLiked = icon.classList.contains('liked');
    const prevCount = parseInt(countSpan.textContent) || 0;
    if (wasLiked) {
      icon.classList.remove('liked');
      icon.classList.remove('bi-heart-fill');
      icon.classList.add('bi-heart');
      countSpan.textContent = Math.max(0, prevCount - 1);
    } else {
      icon.classList.add('liked');
      icon.classList.remove('bi-heart');
      icon.classList.add('bi-heart-fill');
      countSpan.textContent = prevCount + 1;
    }

    // stay after refresh
    try { persistLikeState(postId, !wasLiked, wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1); } catch {}

    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to toggle like');
    const data = await res.json();

    if (data?.data) {
      const { liked, likeCount } = data.data;
      if (liked) {
        icon.classList.add('liked');
        icon.classList.remove('bi-heart');
        icon.classList.add('bi-heart-fill');
      } else {
        icon.classList.remove('liked');
        icon.classList.remove('bi-heart-fill');
        icon.classList.add('bi-heart');
      }
      countSpan.textContent = likeCount;

      try {
        persistLikeState(postId, liked, likeCount);
      } catch (e) {
        console.warn('Failed to persist like state locally:', e);
      }
    }
  } catch (e) {
    console.warn('toggleLike error (silent):', e);
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  const icon = document.getElementById("toggleDarkModeIcon");
  const text = document.getElementById("darkModeText");
  const isDarkMode = document.body.classList.contains("dark-mode");
  
  if (icon) {
    icon.classList.toggle("bi-moon-fill");
    icon.classList.toggle("bi-brightness-high");
  }
  
  if (text) {
    text.textContent = isDarkMode ? "מצב יום" : "מצב לילה";
  }
  
  const logo = document.getElementById("logo");
  
  if (logo) {
    logo.src = isDarkMode ? "images/darkmoodlogo.png" : "images/logo.png";
  }
}

// Scroll button visibility
window.onscroll = function() {
  const btn = document.getElementById("backToTopBtn");
  btn.style.display = document.documentElement.scrollTop > 100 ? "block" : "none";
};

// Scroll to top
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Focus comment input when clicking chat icon
function focusComment(icon) {
  const post = icon.closest(".post-container");
  const input = post.querySelector(".comment-input-simple");
  input.focus();
}

// Toggle comments visibility
function toggleComments(button) {
  const post = button.closest(".post-container");
  const list = post.querySelector(".comments-list");
  
  list.classList.toggle("d-none");
  
  // in sync with server
  const postId = post?.dataset?.postId;
  const currentPost = window.currentPosts?.find(p => String(p._id || p.id) === String(postId));
  const databaseCount = currentPost && Array.isArray(currentPost.comments) ? currentPost.comments.length : 0;
  updateCountsWithValue(post, databaseCount);
}

// Add a comment
async function addComment(button) {
  const post = button.closest('.post-container');
  const postId = post?.dataset?.postId;
  const input = post.querySelector('.comment-input-simple');
  const list = post.querySelector('.comments-list');
  const text = (input.value || '').trim();
  if (!postId || !text) return;

  const token = getToken();
  if (!token) {
    showToast('אנא התחבר כדי להגיב', 'error');
    return;
  }

  
  console.log('ADDING COMMENT - letting server determine count');

  const tempDiv = document.createElement('div');
  tempDiv.className = 'comment-item pending';
  const hasHebrew = /[\u0590-\u05FF]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  
  let contentDir = 'auto';
  let textAlign = 'right';
  if (hasHebrew || hasArabic) {
    contentDir = 'rtl';
    textAlign = 'right';
  } else if (hasEnglish && !hasHebrew && !hasArabic) {
    contentDir = 'ltr';
    textAlign = 'left';
  }
  
  tempDiv.innerHTML = `<div class="comment-text-group"><span class="comment-content" dir="${contentDir}" style="text-align: ${textAlign};">${escapeHtml(text)}</span><span class="comment-username">:${currentUser?.username || 'משתמש'}</span></div>`;
  list.appendChild(tempDiv);
  input.value = '';
  

  try { persistNewComment(postId, { content: text, author: { username: currentUser?.username } }, null); } catch {}

  try {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: text })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Failed to add comment');
      throw new Error(errText);
    }
    const data = await res.json();

   
    if (data?.data?.comment) {
      const real = document.createElement('div');
      real.className = 'comment-item';
      // Ensure we have a valid comment ID
      const commentId = data.data.comment._id || data.data.comment.id;
      if (commentId) {
        real.setAttribute('data-comment-id', commentId);
        console.log('Comment ID set:', commentId);
      } else {
        console.error(' No comment ID found in response:', data.data.comment);
      }
      const username = data.data.comment.author?.username || (currentUser?.username || 'משתמש');
      
      // Detect text direction for the server response comment content
      const serverHasHebrew = /[\u0590-\u05FF]/.test(data.data.comment.content);
      const serverHasArabic = /[\u0600-\u06FF]/.test(data.data.comment.content);
      const serverHasEnglish = /[a-zA-Z]/.test(data.data.comment.content);
      
      let serverContentDir = 'auto';
      let serverTextAlign = 'right';
      if (serverHasHebrew || serverHasArabic) {
        serverContentDir = 'rtl';
        serverTextAlign = 'right';
      } else if (serverHasEnglish && !serverHasHebrew && !serverHasArabic) {
        serverContentDir = 'ltr';
        serverTextAlign = 'left';
      }
      
      // Since this is a comment the current user just added, they can delete it
      real.innerHTML = `
        <div class="comment-text-group">
          <span class="comment-content" dir="${serverContentDir}" style="text-align: ${serverTextAlign};">${escapeHtml(data.data.comment.content)}</span>
          <span class="comment-username">:${username}</span>
        </div>
        <button class="delete-comment-btn" onclick="deleteComment(this)" title="מחק תגובה">×</button>
      `;
      list.replaceChild(real, tempDiv);
      
      // Always use server's authoritative comment count if provided
      if (typeof data.data.commentCount === 'number') {
        console.log('SERVER RESPONSE - using authoritative count:', data.data.commentCount);
        updateCountsWithValue(post, data.data.commentCount);
        
        // Update the cached post data with correct count
        const currentPost = window.currentPosts?.find(p => String(p._id || p.id) === String(postId));
        if (currentPost) {
          // Ensure cached data matches server reality
          while (currentPost.comments.length > data.data.commentCount - 1) {
            currentPost.comments.pop(); // Remove excess cached comments
          }
        }
      }
      
      // Persist the comment (count will be derived from comments array length)
      try {
        persistNewComment(postId, data.data.comment, null);
      } catch (e) {
        console.warn('Failed to persist comment locally:', e);
      }
    }
    // If no comment data from server, keep current count (no additional updates needed)
  } catch (e) {
    console.warn('addComment error (silent):', e);
    tempDiv.classList.add('text-danger');
    tempDiv.innerHTML = `<div class="comment-text-group"><span class="comment-content" dir="${contentDir}" style="text-align: ${textAlign};">${escapeHtml(text)}</span><span class="comment-username">:${currentUser?.username || 'משתמש'}</span></div> <small>(נכשל)</small>`;
    // Error: comment stays in DOM, counters already show correct count
  }
}

// Delete a comment
async function deleteComment(button) {
  const commentItem = button.closest('.comment-item');
  const post = button.closest('.post-container');
  const postId = post?.dataset?.postId;
  const commentId = commentItem?.dataset?.commentId;
  
  console.log('Deleting comment:', { postId, commentId, commentItem });
  
  if (!postId || !commentId) {
    console.error('Missing postId or commentId');
    showToast('שגיאה: חסר מזהה פוסט או תגובה', 'error');
    return;
  }

  const token = getToken();
  if (!token) {
    showToast('אנא התחבר כדי למחוק תגובה', 'error');
    return;
  }

  // Log the comment ID for debugging
  console.log('Attempting to delete comment with ID:', commentId);
  
  // Accept any comment ID format - let the backend handle validation
  if (!commentId) {
    console.error(' No comment ID provided');
    showToast('מזהה תגובה לא תקין - נסה לרענן את הדף', 'error');
    return;
  }

  // Confirm deletion
  if (!confirm('האם אתה בטוח שברצונך למחוק את התגובה?')) {
    return;
  }

  try {
    // Show loading state
    button.disabled = true;
    button.innerHTML = '⌛';

    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Failed to delete comment' }));
      console.error(' Delete comment response not ok:', { status: res.status, error: errData });
      
      if (res.status === 404) {
        throw new Error('התגובה לא נמצאה - ייתכן שכבר נמחקה');
      } else if (res.status === 403) {
        throw new Error('אין לך הרשאה למחוק תגובה זו');
      } else {
        throw new Error(errData.error || 'שגיאה במחיקת התגובה');
      }
    }

    const data = await res.json();
    console.log('Comment deletion response:', data);

    // Remove comment from DOM
    commentItem.remove();

    // Update comment count
    if (typeof data.data?.commentCount === 'number') {
      updateCountsWithValue(post, data.data.commentCount);
    } else {
      // Fallback: count remaining comments in DOM
      const list = post.querySelector('.comments-list');
      const remainingComments = list.querySelectorAll('.comment-item').length;
      updateCountsWithValue(post, remainingComments);
    }

    // Update local data structures to keep everything in sync
    updateLocalCommentData(postId, commentId, data.data?.commentCount);

    // Update cached data
    try {
      persistCommentDeletion(postId, commentId, data.data?.commentCount);
    } catch (e) {
      console.warn('Failed to persist comment deletion locally:', e);
    }

    showToast('התגובה נמחקה בהצלחה', 'success');
    
    
    // Force refresh the post data to ensure consistency
    console.log(' Forcing post data refresh after comment deletion');
    await refreshPostData(postId);

  } catch (e) {
    console.error('Delete comment error:', e);
    
    // Handle specific error cases
    if (e.message.includes('התגובה לא נמצאה')) {
      // Comment not found - remove it from DOM anyway
      console.log('Comment not found, removing from DOM');
      commentItem.remove();
      
      // Update comment count
      const list = post.querySelector('.comments-list');
      const remainingComments = list.querySelectorAll('.comment-item').length;
      updateCountsWithValue(post, remainingComments);
      
      showToast('התגובה הוסרה מהמסך', 'info');
    } else {
      showToast('שגיאה במחיקת התגובה: ' + e.message, 'error');
    }
    
    // Reset button state
    button.disabled = false;
    button.innerHTML = '×';
  }
}

// Clean up cached posts with invalid comment IDs
function cleanupCachedPosts() {
  try {
    const cached = localStorage.getItem('feed_posts');
    if (cached) {
      const posts = JSON.parse(cached);
      let cleanedCount = 0;
      
      posts.forEach(post => {
        if (Array.isArray(post.comments)) {
          const originalCount = post.comments.length;
          post.comments = post.comments.filter(comment => 
            comment._id || comment.id
          );
          if (post.comments.length !== originalCount) {
            cleanedCount += (originalCount - post.comments.length);
          }
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} invalid comments from cached posts`);
        localStorage.setItem('feed_posts', JSON.stringify(posts));
      }
    }
  } catch (error) {
    console.error(' Error cleaning up cached posts:', error);
  }
}


// Refresh post data from server to ensure consistency
async function refreshPostData(postId) {
  try {
    console.log(' Refreshing post data for:', postId);
    
    const token = getToken();
    if (!token) {
      console.warn('No token available for post refresh');
      return;
    }
    
    const response = await fetch(`/api/posts/${postId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Post data refreshed:', data);
      
      // Update local data structures
      if (Array.isArray(window.currentPosts)) {
        const postIndex = window.currentPosts.findIndex(p => 
          String(p._id || p.id) === String(postId)
        );
        
        if (postIndex !== -1) {
          window.currentPosts[postIndex] = data.data;
          console.log('Updated window.currentPosts');
        }
      }
      
      // Update localStorage
      const cached = localStorage.getItem('feed_posts');
      if (cached) {
        const posts = JSON.parse(cached);
        const postIndex = posts.findIndex(p => String(p._id || p.id) === String(postId));
        
        if (postIndex !== -1) {
          posts[postIndex] = data.data;
          localStorage.setItem('feed_posts', JSON.stringify(posts));
          console.log('Updated localStorage');
        }
      }
    } else {
      console.warn('Failed to refresh post data:', response.status);
    }
  } catch (error) {
    console.error(' Error refreshing post data:', error);
  }
}

// Update local comment data after deletion
function updateLocalCommentData(postId, commentId, newCommentCount) {
  try {
    console.log(' Updating local comment data:', { postId, commentId, newCommentCount });
    
    // Update window.currentPosts if available
    if (Array.isArray(window.currentPosts)) {
      const postIndex = window.currentPosts.findIndex(p => 
        String(p._id || p.id) === String(postId)
      );
      
      if (postIndex !== -1) {
        const post = window.currentPosts[postIndex];
        if (Array.isArray(post.comments)) {
          // Remove the deleted comment
          post.comments = post.comments.filter(comment => 
            String(comment._id || comment.id) !== String(commentId)
          );
          console.log('Updated window.currentPosts, remaining comments:', post.comments.length);
        }
      }
    }
    
    // Update localStorage if available
    const cached = localStorage.getItem('feed_posts');
    if (cached) {
      const posts = JSON.parse(cached);
      const postIndex = posts.findIndex(p => String(p._id || p.id) === String(postId));
      
      if (postIndex !== -1) {
        const post = posts[postIndex];
        if (Array.isArray(post.comments)) {
          // Remove the deleted comment
          post.comments = post.comments.filter(comment => 
            String(comment._id || comment.id) !== String(commentId)
          );
          
          // Update localStorage
          posts[postIndex] = post;
          localStorage.setItem('feed_posts', JSON.stringify(posts));
          console.log('Updated localStorage, remaining comments:', post.comments.length);
        }
      }
    }
  } catch (error) {
    console.error(' Error updating local comment data:', error);
  }
}

// Persist comment deletion in cached data
function persistCommentDeletion(postId, commentId, newCommentCount) {
  try {
    const cached = localStorage.getItem('feed_posts');
    if (!cached) return;
    
    const posts = JSON.parse(cached);
    const targetId = String(postId);
    const idx = posts.findIndex(p => String(p._id || p.id) === targetId);
    
    if (idx !== -1) {
      const post = posts[idx];
      if (Array.isArray(post.comments)) {
        // Remove the comment from cached data
        post.comments = post.comments.filter(comment => 
          String(comment._id || comment.id) !== String(commentId)
        );
      }
      
      posts[idx] = post;
      localStorage.setItem('feed_posts', JSON.stringify(posts));
      
      // Also update in-memory currentPosts if available
      if (Array.isArray(window.currentPosts)) {
        const memIdx = window.currentPosts.findIndex(p => String(p._id || p.id) === targetId);
        if (memIdx !== -1) {
          window.currentPosts[memIdx] = { ...window.currentPosts[memIdx], ...post };
        }
      }
    }
  } catch (e) {
    console.warn('persistCommentDeletion error:', e);
  }
}

// Clear cached like states to prevent cross-user like persistence
function clearCachedLikeStates() {
    try {
        const cached = localStorage.getItem('feed_posts');
        if (cached) {
            const posts = JSON.parse(cached);
            // Remove _likedByMe and _likeCount from all posts to force fresh data from server
            posts.forEach(post => {
                delete post._likedByMe;
                delete post._likeCount;
            });
            localStorage.setItem('feed_posts', JSON.stringify(posts));
            console.log(' Cleared cached like states to prevent cross-user persistence');
        }
    } catch (e) {
        console.warn('Failed to clear cached like states:', e);
    }
}

// Persist like changes for a post into currentPosts and localStorage
function persistLikeState(postId, liked, likeCount) {
  try {
    const cached = localStorage.getItem('feed_posts');
    const userId = window.currentUser?.userId;
    const posts = cached ? JSON.parse(cached) : [];
    const targetId = String(postId);
    let idx = posts.findIndex(p => String(p._id || p.id) === targetId);
    if (idx === -1) {
      // Create a minimal entry if not found so we can persist state
      posts.push({ _id: targetId, likes: [], comments: [] });
      idx = posts.length - 1;
    }
    const post = posts[idx];
    // Normalize likes to array if possible
    if (!Array.isArray(post.likes)) {
      post.likes = Array.isArray(post.likes) ? post.likes : [];
    }
    if (userId) {
      const has = post.likes.some(l => (l?._id || l) === userId);
      if (liked && !has) {
        post.likes.push(userId);
      } else if (!liked && has) {
        post.likes = post.likes.filter(l => (l?._id || l) !== userId);
      }
    }
    // Fallback to set length if server dictates
    if (typeof likeCount === 'number') {
      // If mismatch, adjust length metadata
      post._likeCount = likeCount;
    }
    // Cache explicit likedByMe flag for quick UI
    if (typeof liked === 'boolean') {
      post._likedByMe = liked;
    }
    posts[idx] = post;
    localStorage.setItem('feed_posts', JSON.stringify(posts));
    // Also update in-memory currentPosts if available
    try {
      if (Array.isArray(window.currentPosts)) {
        const memIdx = window.currentPosts.findIndex(p => String(p._id || p.id) === targetId);
        if (memIdx !== -1) {
          window.currentPosts[memIdx] = { ...window.currentPosts[memIdx], ...post };
        }
      }
    } catch {}
  } catch (e) {
    console.warn('persistLikeState error:', e);
  }
}

// Persist newly added comment into currentPosts and localStorage
function persistNewComment(postId, comment, commentCount) {
  try {
    const cached = localStorage.getItem('feed_posts');
    if (!cached) return;
    const posts = JSON.parse(cached);
    const targetId = String(postId);
    const idx = posts.findIndex(p => String(p._id || p.id) === targetId);
    if (idx === -1) return;
    const post = posts[idx];
    if (!Array.isArray(post.comments)) post.comments = [];
    
    // Store minimal safe structure
    const safeComment = {
      content: comment?.content || '',
      author: comment?.author ? { username: comment.author.username } : { username: (window.currentUser?.username || 'משתמש') },
      createdAt: comment?.createdAt || new Date().toISOString()
    };
    
    // Avoid duplicate comments - check if comment already exists
    const commentExists = post.comments.some(existingComment => 
      existingComment.content === safeComment.content && 
      existingComment.author?.username === safeComment.author?.username &&
      Math.abs(new Date(existingComment.createdAt) - new Date(safeComment.createdAt)) < 5000 // Within 5 seconds
    );
    
    if (!commentExists) {
      post.comments.push(safeComment);
    }
    
    
    posts[idx] = post;
    localStorage.setItem('feed_posts', JSON.stringify(posts));
    // Also update in-memory currentPosts if available
    try {
      if (Array.isArray(window.currentPosts)) {
        const memIdx = window.currentPosts.findIndex(p => String(p._id || p.id) === targetId);
        if (memIdx !== -1) {
          window.currentPosts[memIdx] = { ...window.currentPosts[memIdx], ...post };
        }
      }
    } catch {}
  } catch (e) {
    console.warn('persistNewComment error:', e);
  }
}

// Simple HTML escape to prevent injection in optimistic rendering
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Update counters with a specific value (prevents jumps and ensures synchronization)
function updateCountsWithValue(post, count) {
  // Update the comment count icon
  post.querySelector(".comment-count-icon").textContent = count;
  
  // Update the toggle button text
  const commentToggleBtn = post.querySelector(".comment-toggle-btn");
  if (commentToggleBtn) {
    const list = post.querySelector(".comments-list");
    const isVisible = !list.classList.contains("d-none");
    commentToggleBtn.innerHTML = `${isVisible ? "הסתר" : "הצג"} תגובות (<span class="comment-count">${count}</span>)`;
  }
}

// Update counters (legacy function, now uses updateCountsWithValue for consistency)
function updateCounts(post) {
  const postId = post?.dataset?.postId;
  const currentPost = window.currentPosts?.find(p => String(p._id || p.id) === String(postId));
  const databaseCount = currentPost && Array.isArray(currentPost.comments) ? currentPost.comments.length : 0;
  updateCountsWithValue(post, databaseCount);
}

// Clear corrupted cache if needed
function clearCorruptedCache() {
  console.log('🧹 Clearing potentially corrupted cache data');
  localStorage.removeItem('feed_posts');
  if (window.currentPosts) {
    window.currentPosts = [];
  }
}

// Setup input behavior
document.addEventListener("DOMContentLoaded", async () => {
  console.log('=== DOM CONTENT LOADED ===');
  
  // Clean up any cached posts with invalid comment IDs
  cleanupCachedPosts();
  
  // Add global event listener to detect modal changes and re-enable click events
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const modals = document.querySelectorAll('.modal.show, .modal.d-block');
        const backdrops = document.querySelectorAll('.modal-backdrop.show');
        
        // If no modals are present, ensure click events are enabled
        if (modals.length === 0 && backdrops.length === 0) {
          setTimeout(() => {
            forceReenableClickEvents();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
          }, 50);
        }
      }
    });
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Add event listener debugging for follow buttons
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('follow-btn')) {
      console.log('Follow button clicked:', event.target);
      console.log('Button text:', event.target.textContent);
      console.log('Button onclick:', event.target.onclick);
      console.log('Button parent:', event.target.parentElement);
    }
  });
  
  // Add proper event delegation for follow buttons
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('follow-btn')) {
      event.preventDefault();
      toggleFollow(event.target, event);
    }
  });
  

  try {
    const cached = localStorage.getItem('feed_posts');
    if (cached) {
      const cachedPosts = JSON.parse(cached);
      if (Array.isArray(cachedPosts) && cachedPosts.length > 0) {
        console.log('Found cached posts, but waiting for proper filtering before rendering:', cachedPosts.length);
        // Store cached posts for later filtering, but don't render yet
        currentPosts = cachedPosts;
      }
    }
  } catch (e) {
    console.warn('Failed to load cached posts:', e);
  }
  

  
  // Check for JWT
  const token = getToken();
  if (!token) {
    console.log('No JWT token found, redirecting to login');
    window.location.href = "index.html";
    return;
  }
  
  // Clear previous user data before loading new user data
  clearPreviousUserData();


  // Check if username elements exist
  const sidebarUsername = document.getElementById('sidebarUsername');
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  
  console.log('Username elements found:');
  console.log('- sidebarUsername:', sidebarUsername ? 'EXISTS' : 'MISSING');
  console.log('- suggestionsUsername:', suggestionsUsername ? 'EXISTS' : 'MISSING');
  
  if (!sidebarUsername || !suggestionsUsername) {
    console.error('Username elements not found! Check HTML structure');
    return;
  }

  // Check if we have stored username and show it immediately
  const storedUsername = localStorage.getItem("username");
  if (storedUsername) {
    console.log('Found stored username:', storedUsername);
    updateUsernameDisplay(storedUsername);
    
    // Test immediate display
    setTimeout(() => {
      console.log('Testing username display after 100ms...');
      checkUsernameDisplay();
    }, 100);
  } else {
    console.log('No stored username, trying to extract from token');
    // Try to extract username from token as fallback
    const extractedUsername = extractUsernameFromToken(token);
    if (extractedUsername) {
      console.log('Extracted username from token:', extractedUsername);
      localStorage.setItem("username", extractedUsername);
      updateUsernameDisplay(extractedUsername);
      
      // Test immediate display
      setTimeout(() => {
        console.log('Testing username display after 100ms...');
        checkUsernameDisplay();
      }, 100);
    } else {
      console.log('Could not extract username from token');
    }
  }
  
  // Force update username display from token to ensure it's current
  const currentUsername = extractUsernameFromToken(token);
  if (currentUsername) {
    console.log('Forcing username update to current token username:', currentUsername);
    updateUsernameDisplay(currentUsername);
  }

  // Fetch current user data and update avatars
  try {
    console.log('Fetching current user data...');
    await fetchCurrentUser();
  } catch (error) {
    console.error('Failed to fetch current user data:', error);
    // Set fallback avatars if fetch fails
    setFallbackAvatars();
  }

  try {
    // Load feed posts first (always render)
    await loadFeedPosts();
    
    // Initialize comment forms for all existing posts
    document.querySelectorAll(".post-container").forEach(post => {
      initializeCommentForm(post);
    });
    
    // Also initialize any comment forms that might not be in post containers
    document.querySelectorAll(".comment-form").forEach(form => {
      const input = form.querySelector(".comment-input-simple");
      const btn = form.querySelector(".send-btn");
      const indicator = form.parentElement.querySelector(".typing-status");

      // Ensure elements start hidden using Bootstrap classes
      btn.classList.add("d-none");
      if (indicator) indicator.classList.add("d-none");

      let typingTimeout;

      input.addEventListener("input", () => {
        const hasText = input.value.trim() !== "";
        
        // Toggle send button visibility
        btn.classList.toggle("d-none", !hasText);

        if (hasText) {
          indicator.classList.remove("d-none");
          clearTimeout(typingTimeout);
          typingTimeout = setTimeout(() => {
            indicator.classList.add("d-none");
          }, 1000);
        } else {
          indicator.classList.add("d-none");
          clearTimeout(typingTimeout);
        }
      });

      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          btn.click();
        }
      });
    });
    
    // Try to load stories separately (posts always render even if stories fail)
    try {
      await loadStories();
    } catch (e) {
      console.warn('Failed to load stories, but posts are working:', e);
    }
    
  } catch (error) {
    console.error('Error loading feed data:', error);
    // Handle error - maybe redirect to login if token is invalid
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("username");
      window.location.href = "index.html";
    }
  }
});

// Load feed posts from backend
async function loadFeedPosts() {
  const token = getToken();
  if (!token) throw new Error('No token found');

  try {
    console.log('Starting to load feed posts...');
    
    // Clear cached like states to ensure fresh data from server
    clearCachedLikeStates();
    
    // Extract username from JWT token and set currentUser - DECLARE currentUserId EARLY
    const usernameFromToken = extractUsernameFromToken(token);
    if (!usernameFromToken) {
      throw new Error('Could not extract username from token');
    }
    const currentUserId = usernameFromToken; // Declare currentUserId early
    currentUser = { username: usernameFromToken };
    
    // First, try to get username from localStorage if available
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      // Show username immediately while loading other data
      updateUsernameDisplay(storedUsername);
      console.log('Using stored username:', storedUsername);
    }

    // Check backend health first
    const isBackendHealth = await checkBackendHealth();
    if (!isBackendHealth) {
      showErrorMessage('השרת לא זמין כרגע, נסה שוב מאוחר יותר');
      throw new Error('Backend is not accessible');
    }
    
    // Load posts (backend now handles filtering)
    console.log('Fetching posts (backend handles following + own filtering)...');
    console.log('Using token:', token ? 'Token exists' : 'No token');
    
    const feedResponse = await fetch("/api/posts", { 
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!feedResponse.ok) {
      throw new Error(`Failed to fetch posts: ${feedResponse.status}`);
    }
    
    const allPosts = await feedResponse.json();
    console.log('All posts loaded:', allPosts.length);
    
    if (allPosts.length > 0) {
      console.log('Sample post structure:', allPosts[0]);
      console.log('Post author structure:', allPosts[0]?.author);
      console.log('=== POSTS LOADED ===');
      console.log('Your username from token:', currentUserId);
      console.log('Total posts received:', allPosts.length);
    }
    
    // Backend now returns only relevant posts (following + own), so no filtering needed
    let followingPosts = allPosts;
    
    console.log(`Backend returned ${allPosts.length} posts (following + own)`);
    console.log(`No additional filtering needed - backend handles it`);
    
    // Sort posts by creation date: newest first
    followingPosts.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB - dateA; // Newest first
    });
    
    console.log('Posts sorted by date (newest first):', followingPosts.length);
    
    const myPostsCount = followingPosts.filter(post => 
      post.author?.username === currentUserId
    ).length;
    console.log(`Found ${myPostsCount} of your own posts in the results`);
    
    // Merge server posts with any cached local overrides (likes/comments state)
    try {
      const cached = localStorage.getItem('feed_posts');
      if (cached) {
        const cachedPosts = JSON.parse(cached);
        const idToCached = new Map(cachedPosts.map(p => [String(p._id || p.id), p]));
        followingPosts = followingPosts.map(p => {
          const pid = String(p._id || p.id);
          const cachedPost = idToCached.get(pid);
          if (!cachedPost) return p;
          // Carry over local overrides
          if (typeof cachedPost._likedByMe === 'boolean') p._likedByMe = cachedPost._likedByMe;
          if (typeof cachedPost._likeCount === 'number') p._likeCount = cachedPost._likeCount;
          
          // Handle comments: prefer local comments if they have more items (user added comments offline)
          const srvLen = Array.isArray(p.comments) ? p.comments.length : 0;
          const locLen = Array.isArray(cachedPost.comments) ? cachedPost.comments.length : 0;
          
          if (locLen > srvLen) {
            const localCommentsWithValidIds = cachedPost.comments.filter(comment => 
              comment._id || comment.id
            );
            
            if (localCommentsWithValidIds.length > srvLen) {
              console.log('Using local comments with valid IDs:', localCommentsWithValidIds.length);
              p.comments = localCommentsWithValidIds;
            } else {
              console.log('Local comments missing valid IDs, using server comments');
            }
          }
          // Always use the comments array length as the source of truth - no cached _commentCount
          
          return p;
        });
      }
    } catch (e) {
      console.warn('Failed merging cached posts:', e);
    }

    // Store posts in localStorage for offline access (after merge)
    localStorage.setItem('feed_posts', JSON.stringify(followingPosts));
    currentPosts = followingPosts;
    window.currentPosts = followingPosts;
    
    // Update username display with current user data
    if (window.currentUser && window.currentUser.username) {
      updateUsernameDisplay(window.currentUser.username);
    }
    
    // Render all components
    console.log('Rendering components...');
    
    // Use currentUser from window if available (more up-to-date)
    const userToRender = window.currentUser || currentUser;
    console.log('Rendering header with user:', userToRender);
    
    renderHeader(userToRender);
    // renderSuggestions(currentSuggestions); // Static suggestions now, no need to render dynamically
    
    // Only render posts if we haven't already rendered them from cache
    if (currentPosts.length > 0 && document.querySelectorAll('.post-container').length === 0) {
      renderPosts(currentPosts);
      console.log('Posts rendered from server data');
    }
    
    // Suggestions are now loaded dynamically, no need to render here
    
    console.log('Feed posts loading completed successfully');
    
  } catch (error) {
    console.error('Error loading feed posts:', error);
    
    // If we have a stored username, still show it even if API fails
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      updateUsernameDisplay(storedUsername);
      showErrorMessage('שגיאה בטעינת הנתונים, אבל שם המשתמש זמין');
    } else {
      showErrorMessage('שגיאה בטעינת נתוני המשתמש');
    }
    
    throw error;
  }
}

// Load suggestions from backend
async function loadSuggestions() {
  try {
    console.log('loadSuggestions function called');
    
    const token = getToken();
    if (!token) {
      console.log('No token available for suggestions');
      return;
    }

    console.log('Fetching suggestions from backend...');
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Suggestions request timed out after 5 seconds');
      controller.abort();
    }, 5000);
    
    const response = await fetch('/api/users/suggestions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data) {
        currentSuggestions = data.data;
        console.log('Loaded suggestions:', currentSuggestions.length);
        
        // Render suggestions in the sidebar
        renderSuggestions(currentSuggestions);
      } else {
        console.log('No suggestions data received');
        currentSuggestions = [];
        renderSuggestions([]);
      }
    } else {
      console.warn('Failed to load suggestions:', response.status);
      currentSuggestions = [];
      renderSuggestions([]);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Suggestions request timed out');
    } else {
      console.error('Error loading suggestions:', error);
    }
    currentSuggestions = [];
    renderSuggestions([]);
  }
}

// Auto-load suggestions when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log(' DOM loaded, attempting to load suggestions...');
  // Wait a bit for authentication to complete
  setTimeout(() => {
    if (typeof loadSuggestions === 'function') {
      console.log('Calling loadSuggestions from DOMContentLoaded...');
      loadSuggestions();
    } else {
      console.log(' loadSuggestions not ready yet, waiting...');
      // Try again after a longer delay
      setTimeout(() => {
        if (typeof loadSuggestions === 'function') {
          console.log('Calling loadSuggestions after delay...');
          loadSuggestions();
        }
      }, 2000);
    }
  }, 1000);
});

// Load stories from backend
async function loadStories() {
  const token = getToken();
  if (!token) throw new Error('No token found');

  try {
    console.log('Loading stories...');
    
    // Load stories
    console.log('Fetching stories from /api/stories/rings...');
    const storiesResponse = await fetch("/api/stories/rings", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (storiesResponse.ok) {
      const storiesData = await storiesResponse.json();
      console.log('Stories API response:', storiesData);
      
      if (storiesData.success && (storiesData.data || storiesData.items)) {
        const rings = storiesData.data || storiesData.items || [];
        
        // Build ordered array: non-isMe first, then isMe
        const orderedStories = [
          ...rings.filter(story => !story.isMe),
          ...rings.filter(story => story.isMe)
        ];
        
        currentStories = orderedStories;
        globalStories = orderedStories;
        
        console.log('Stories loaded:', rings.length);
        console.log('Ordered stories:', orderedStories.map(s => ({ username: s.username, isMe: s.isMe })));
        
        // Log story details for debugging
        if (orderedStories.length > 0) {
          console.log('Sample story:', orderedStories[0]);
          console.log('Story validation:', {
            hasOwnerId: !!orderedStories[0].ownerId,
            hasUsername: !!orderedStories[0].username,
            hasAvatarUrl: !!orderedStories[0].avatarUrl,
            hasStoryImageUrl: !!orderedStories[0].storyImageUrl,
            isMe: orderedStories[0].isMe
          });
          
          const myStory = orderedStories.find(story => story.isMe);
          if (myStory) {
            console.log('My story found:', myStory);
          }
        }
        
        // Log all stories to see what we're getting
        console.log('All stories received from server:', orderedStories.map(s => ({
          username: s.username,
          hasStoryImageUrl: !!s.storyImageUrl,
          storyImageUrl: s.storyImageUrl,
          storyImageUrlType: typeof s.storyImageUrl
        })));
        
        // Render stories with ordered array
        renderStories(orderedStories);
      } else {
        console.warn('Stories API returned no data:', storiesData);
        currentStories = [];
        globalStories = [];
      }
    } else {
      console.warn('Stories API failed:', storiesResponse.status);
      currentStories = [];
      globalStories = [];
    }
    
    console.log('Stories loading completed');
    
  } catch (error) {
    console.error('Error loading stories:', error);
    currentStories = [];
    globalStories = [];
    throw error;
  }
}

// Load all feed data from backend (legacy function - kept for compatibility)
async function loadFeedData() {
  const token = getToken();
  if (!token) throw new Error('No token found');

  try {
    console.log('Starting to load feed data...');
    
    // Extract username from JWT token and set currentUser - DECLARE currentUserId EARLY
    const usernameFromToken = extractUsernameFromToken(token);
    if (!usernameFromToken) {
      throw new Error('Could not extract username from token');
    }
    const currentUserId = usernameFromToken; // Declare currentUserId early
    currentUser = { username: usernameFromToken };
    
    // First, try to get username from localStorage if available
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      // Show username immediately while loading other data
      updateUsernameDisplay(storedUsername);
      console.log('Using stored username:', storedUsername);
    }

    // Check backend health first
    const isBackendHealth = await checkBackendHealth();
    if (!isBackendHealth) {
      showErrorMessage('השרת לא זמין כרגע, נסה שוב מאוחר יותר');
      throw new Error('Backend is not accessible');
    }
    
    // Load stories
    console.log('Fetching stories from /api/stories/rings...');
    const storiesResponse = await fetch("/api/stories/rings", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (storiesResponse.ok) {
      const storiesData = await storiesResponse.json();
      console.log('Stories API response:', storiesData);
      
      if (storiesData.success && (storiesData.data || storiesData.items)) {
        const rings = storiesData.data || storiesData.items || [];
        currentStories = rings;
        globalStories = rings;
        console.log('Stories loaded:', rings.length);
        
        // Log story details for debugging
        if (rings.length > 0) {
          console.log('Sample story:', rings[0]);
          console.log('Story validation:', {
            hasOwnerId: !!rings[0].ownerId,
            hasUsername: !!rings[0].username,
            hasAvatarUrl: !!rings[0].avatarUrl,
            hasStoryImageUrl: !!rings[0].storyImageUrl,
            isMe: rings[0].isMe
          });
          
          const myStory = rings.find(story => story.isMe);
          if (myStory) {
            console.log('My story found:', myStory);
          }
        }
      } else {
        console.warn('Stories API returned no data:', storiesData);
        currentStories = [];
        globalStories = [];
      }
    } else {
      console.warn('Stories API failed:', storiesResponse.status);
      currentStories = [];
      globalStories = [];
    }
    
    // Load suggestions dynamically from backend (non-blocking)
    console.log('Loading dynamic suggestions...');
    
    // Test if function exists
    if (typeof loadSuggestions === 'function') {
      console.log('loadSuggestions function exists, calling it...');
      loadSuggestions().catch(error => {
        console.warn(' Suggestions failed to load:', error);
        // Show fallback message
        const container = document.getElementById('suggestionsContainer');
        if (container) {
          container.innerHTML = `
            <div class="text-center text-muted">
              <i class="bi bi-exclamation-triangle me-2"></i>
              לא ניתן לטעון הצעות כרגע
            </div>
          `;
        }
      });
    } else {
      console.error(' loadSuggestions function not found!');
      console.log('Available functions:', Object.keys(window).filter(key => typeof window[key] === 'function'));
    }
    
          // Load posts (backend now handles filtering)
      console.log('Fetching posts (backend handles following + own filtering)...');
    console.log('Using token:', token ? 'Token exists' : 'No token');
    
    const feedResponse = await fetch("/api/posts", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log('Feed response status:', feedResponse.status);
    console.log('Feed response headers:', Object.fromEntries(feedResponse.headers.entries()));
    
    if (feedResponse.ok) {
      const allPosts = await feedResponse.json();
      console.log('All posts loaded:', allPosts.length);
      
      // Debug: Log the structure of first few posts
      if (allPosts.length > 0) {
        console.log('Sample post structure:', allPosts[0]);
        console.log('Post author structure:', allPosts[0]?.author);
        console.log('=== POSTS LOADED ===');
        console.log('Your username from token:', currentUserId);
        console.log('Total posts received:', allPosts.length);
      }
      
      // Backend now returns only relevant posts (following + own), so no filtering needed
      let followingPosts = allPosts;
      
      console.log(`Backend returned ${allPosts.length} posts (following + own)`);
      console.log(`No additional filtering needed - backend handles it`);
      
      // Sort posts by creation date: newest first
      followingPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; // Newest first
      });
      
      console.log('Posts sorted by date (newest first):', followingPosts.length);
      
      // Log how many of your own posts were found
      const myPostsCount = followingPosts.filter(post => 
        post.author?.username === currentUserId
      ).length;
      console.log(`Found ${myPostsCount} of your own posts in the results`);
      
      // Get cached posts from localStorage
      let cachedPosts = [];
      try {
        const cached = localStorage.getItem('feed_posts');
        if (cached) {
          cachedPosts = JSON.parse(cached);
          console.log('Cached posts loaded:', cachedPosts.length);
          
          // Also filter cached posts by following + your own
          let filteredCachedPosts = cachedPosts.filter(post => {
            // Always show your own posts
            if (post.author?.username === currentUserId) {
              console.log(`Keeping cached post by username: ${post.content?.substring(0, 30)}...`);
              return true;
            }
            
            // Check if post author is in following list
            const isFollowing = followingUserIds.some(followingId => 
              followingId.toString() === post.author?._id?.toString()
            );
            
            if (isFollowing) {
              console.log(`Keeping cached post from user you follow: ${post.author?.username}`);
            } else {
              console.log(`Filtering out cached post from: ${post.author?.username} (not following)`);
            }
            
            return isFollowing;
          });
          
          // Sort cached posts by creation date: newest first
          filteredCachedPosts.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateB - dateA; 
          });
          
          console.log('Filtered cached posts (following + your own, sorted by date):', filteredCachedPosts.length);
          cachedPosts = filteredCachedPosts;
        }
      } catch (e) {
        console.warn('Failed to load cached posts:', e);
      }
      
      // Merge server posts with cached posts, avoiding duplicates
      const serverPostIds = new Set(followingPosts.map(p => p._id));
      const uniqueCachedPosts = cachedPosts.filter(p => !serverPostIds.has(p._id));
      
      // Combine posts: server posts first, then unique cached posts
      currentPosts = [...followingPosts, ...uniqueCachedPosts];
      
      // Sort posts by creation date: newest first (most recent at top)
      currentPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA; 
      });
      
      console.log('Combined following posts total:', currentPosts.length);
      console.log('Posts details (sorted by date):', currentPosts.map(p => ({ 
        id: p._id, 
        title: p.title, 
        author: p.author?.username || 'Unknown', 
        content: p.content?.substring(0, 50) + '...',
        createdAt: p.createdAt || p.created_at
      })));
      
      // Save combined posts to localStorage for persistence after refresh
      try {
        localStorage.setItem('feed_posts', JSON.stringify(currentPosts));
        console.log('Following posts saved to localStorage for persistence');
        
        // Also update the cached posts in the DOM immediately
        if (currentPosts.length > 0) {
          renderPosts(currentPosts);
          console.log('Following posts rendered immediately after combining');
        }
      } catch (e) {
        console.warn('Failed to save following posts to localStorage:', e);
      }
    } else {
      console.warn('Feed API failed:', feedResponse.status);
      const errorText = await feedResponse.text();
      console.error('Feed API error response:', errorText);
      
      // If server fails, try to load from cache (filtered by following)
      try {
        const cached = localStorage.getItem('feed_posts');
        if (cached) {
          const allCachedPosts = JSON.parse(cached);
          console.log('All cached posts loaded:', allCachedPosts.length);
          
          // Filter cached posts by following + your own
          currentPosts = allCachedPosts.filter(post => {
            // Always show your own posts
            if (post.author?.username === currentUserId) {
              return true;
            }
            
            // Check if post author is in following list
            const isFollowing = followingUserIds.some(followingId => 
              followingId.toString() === post.author?._id?.toString()
            );
            return isFollowing;
          });
          
          console.log('Using filtered cached posts due to server failure (following + your own):', currentPosts.length);
          
          // Render filtered cached posts if server failed
          if (currentPosts.length > 0) {
            renderPosts(currentPosts);
            console.log('Filtered cached posts rendered due to server failure');
          }
        }
      } catch (e) {
        console.warn('Failed to load cached posts:', e);
      }
    }
    
    // Render all components
    console.log('Rendering components...');
    
    // Use currentUser from window if available (more up-to-date)
    const userToRender = window.currentUser || currentUser;
    console.log('Rendering header with user:', userToRender);
    
    renderHeader(userToRender);
    renderStories(currentStories);
    // renderSuggestions(currentSuggestions); // Static suggestions now, no need to render dynamically
    
    // Only render posts if we haven't already rendered them from cache
    if (currentPosts.length > 0 && document.querySelectorAll('.post-container').length === 0) {
      renderPosts(currentPosts);
      console.log('Posts rendered from server data');
    }
    
    // Suggestions are now loaded dynamically, no need to render here
    
    console.log('Feed data loading completed successfully');
    
  } catch (error) {
    console.error('Error loading feed data:', error);
    
    // If we have a stored username, still show it even if API fails
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      updateUsernameDisplay(storedUsername);
      showErrorMessage('שגיאה בטעינת הנתונים, אבל שם המשתמש זמין');
    } else {
      showErrorMessage('שגיאה בטעינת נתוני המשתמש');
    }
    
    throw error;
  }
}

// Update username display immediately
function updateUsernameDisplay(username) {
  console.log('updateUsernameDisplay called with:', username);
  
  // Update sidebar profile - always show "פרופיל" instead of username
  const sidebarUsername = document.getElementById('sidebarUsername');
  if (sidebarUsername) {
    sidebarUsername.textContent = 'פרופיל'; // Always show "פרופיל" in sidebar
    sidebarUsername.classList.remove('text-danger'); // Remove error styling
    console.log('Updated sidebarUsername to: פרופיל');
  } else {
    console.warn('sidebarUsername element not found');
  }
  
  // Update suggestions sidebar profile - keep dynamic username here
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  if (suggestionsUsername) {
    suggestionsUsername.textContent = username; 
    suggestionsUsername.classList.remove('text-danger'); 
    console.log('Updated suggestionsUsername to:', username);
  } else {
    console.warn('suggestionsUsername element not found');
  }
  
  // Update localStorage and current user object
  if (username) {
    localStorage.setItem('username', username);
    if (window.currentUser) {
      window.currentUser.username = username;
    }
    console.log('Updated localStorage and currentUser.username to:', username);
  }
  
  // Also update the header to ensure suggestions bar is updated
  renderHeader(window.currentUser);
}

// Clear previous user data when new user logs in
function clearPreviousUserData() {
  console.log('🧹 Clearing previous user data...');
  
  // Clear username display elements
  const sidebarUsername = document.getElementById('sidebarUsername');
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  
  if (sidebarUsername) {
    sidebarUsername.textContent = 'מתחבר...';
    console.log('Cleared sidebarUsername');
  }
  
  if (suggestionsUsername) {
    suggestionsUsername.textContent = 'מתחבר...';
    console.log('Cleared suggestionsUsername');
  }
  
  // Clear username only; keep feed_posts to preserve likes/comments across refresh
  localStorage.removeItem('username');
  console.log('Cleared localStorage username (kept feed_posts for persistence)');
}

// Show error message to user (without overriding username)
function showErrorMessage(message) {
  console.log('showErrorMessage called with:', message);
};

// Render user header information
function renderHeader(user) {
  if (!user) {
    console.log('renderHeader called with no user data');
    return;
  }
  
  console.log('=== RENDER HEADER ===');
  console.log('User data:', user);
  console.log('Username:', user.username);
  console.log('Avatar URL:', user.avatarUrl);
  
  // Update sidebar profile
  const sidebarProfilePic = document.getElementById('sidebarProfilePic');
  const sidebarUsername = document.getElementById('sidebarUsername');
  
  if (sidebarProfilePic && user.avatarUrl) {
    sidebarProfilePic.src = user.avatarUrl;
    console.log('Updated sidebar profile picture');
  }
  
  if (sidebarUsername) {
    sidebarUsername.textContent = 'פרופיל'; // Always show "פרופיל" in sidebar
    console.log('Updated sidebar username to: פרופיל');
  }
  
  // Update suggestions sidebar profile
  const suggestionsProfilePic = document.getElementById('suggestionsProfilePic');
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  
  if (suggestionsProfilePic && user.avatarUrl) {
    suggestionsProfilePic.src = user.avatarUrl;
    console.log('Updated suggestions profile picture');
  }
  
  if (suggestionsUsername) {
    suggestionsUsername.textContent = user.username || 'משתמש';
    console.log('Updated suggestions username to:', user.username || 'משתמש');
  }
}

// Render stories
function renderStories(stories) {
  if (!Array.isArray(stories)) {
    console.warn('renderStories: stories is not an array:', stories);
    return;
  }
  
  const container = document.getElementById('storiesContainer');
  if (!container) return;
  
  // Update global stories array for navigation
  globalStories = stories || [];
  
  if (!stories || stories.length === 0) {
    container.innerHTML = '<div class="text-center text-muted">אין סיפורים להצגה</div>';
    return;
  }
  
  container.innerHTML = '';
  
  // Clear existing content instead of replacing the container
  container.innerHTML = '';
  const storiesContainer = container;
  
  // Render all stories in order (non-isMe first, then isMe)
  stories.forEach((story, index) => {
    // Check if story has been seen
    const seenStories = JSON.parse(localStorage.getItem(`seenStories:${window.currentUser?.userId}`) || '[]');
    const isSeen = seenStories.includes(story.ownerId);
    
    // Check if story has a valid URL
    const hasValidStoryUrl = story.storyImageUrl && 
                            story.storyImageUrl !== null && 
                            story.storyImageUrl !== undefined &&
                            story.storyImageUrl.trim() !== '' && 
                            story.storyImageUrl !== 'null' && 
                            story.storyImageUrl !== 'undefined';
    
    console.log(`Story ${story.username}: hasValidStoryUrl=${hasValidStoryUrl}, storyImageUrl="${story.storyImageUrl}"`);
    
    const storyHTML = `
      <div class="story-section text-center ${story.isMe ? 'my-ring' : ''}" 
           data-owner-id="${story.ownerId}" 
           data-story-url="${story.storyImageUrl || ''}">
        <img src="${story.avatarUrl || '/images/profile.jpg'}" 
             class="story-photo rounded-circle ${isSeen ? 'seen' : ''}" 
             alt="${story.username || 'User'}" 
             onclick="openStoryOverlay('${story.ownerId || ''}', '${story.storyImageUrl || ''}')" 
             style="cursor: pointer;" />
        <div class="story-label" onclick="viewUserProfile('${story.ownerId || ''}')" style="cursor: pointer;">${story.username || 'משתמש'}</div>
      </div>
    `;
    storiesContainer.insertAdjacentHTML('beforeend', storyHTML);
    
    // Preload story image to avoid flicker (only if URL exists and is valid)
    if (hasValidStoryUrl) {
      preloadImage(story.storyImageUrl);
    }
  });
  
  // Add click handler for story rings (remove old ones first to prevent duplicates)
  storiesContainer.removeEventListener('click', handleStoryClick);
  storiesContainer.addEventListener('click', handleStoryClick);
}

// Preload image to avoid flicker
function preloadImage(url) {
  if (!url || url === null || url === undefined || url.trim() === '' || url === 'null' || url === 'undefined') {
    console.log('Skipping preload for invalid URL:', url);
    return;
  }
  
  const img = new Image();
  img.onerror = function() {
    console.warn('Failed to preload image:', url);
  };
  img.src = url;
}

// Handle story click
function handleStoryClick(event) {
  const storySection = event.target.closest('.story-section');
  if (!storySection) return;
  
  const ownerId = storySection.dataset.ownerId;
  const storyUrl = storySection.dataset.storyUrl;
  
  if (!ownerId) return;
  
  // Build storyIndexByOwnerId map
  const storyIndexByOwnerId = new Map(globalStories.map((s, i) => [s.ownerId, i]));
  const resolvedIndex = storyIndexByOwnerId.get(ownerId);
  
  // Temporary logs to verify correctness
  console.log('Story clicked:', { 
    ownerId, 
    storyUrl, 
    resolvedIndex,
    username: globalStories[resolvedIndex]?.username || 'Unknown'
  });
  console.log('globalStories order:', globalStories.map((s, i) => ({ index: i, username: s.username, ownerId: s.ownerId })));
  console.log('storyIndexByOwnerId map:', Array.from(storyIndexByOwnerId.entries()));
  
  // Check if story has a valid URL
  if (!storyUrl || storyUrl === null || storyUrl === undefined || storyUrl.trim() === '' || storyUrl === 'null' || storyUrl === 'undefined') {
    console.log('Story has no valid URL, cannot open overlay');
    alert('אין סטורי זמין למשתמש זה');
    return;
  }
  
  // Only open overlay if story has a valid URL and resolved index
  if (resolvedIndex !== undefined) {
    // Open story at resolved index
    openStoryAt(resolvedIndex);
  } else {
    console.log('Could not resolve story index, cannot open overlay');
    alert('שגיאה בפתיחת הסטורי');
  }
}

// Mark story as seen
function markStoryAsSeen(ownerId) {
  if (!window.currentUser?.userId) return;
  
  const key = `seenStories:${window.currentUser.userId}`;
  const seenStories = JSON.parse(localStorage.getItem(key) || '[]');
  
  if (!seenStories.includes(ownerId)) {
    seenStories.push(ownerId);
    localStorage.setItem(key, JSON.stringify(seenStories));
    
    // Update visual state
    const storySection = document.querySelector(`[data-owner-id="${ownerId}"]`);
    if (storySection) {
      const storyPhoto = storySection.querySelector('.story-photo');
      if (storyPhoto) {
        storyPhoto.classList.add('seen');
      }
    }
  }
}

// Open story overlay
function openStoryOverlay(ownerId, storyUrl) {
  console.log('Opening story overlay:', { ownerId, storyUrl });
  
  // Check if storyUrl is valid before proceeding
  if (!storyUrl || storyUrl === null || storyUrl === undefined || storyUrl.trim() === '' || storyUrl === 'null' || storyUrl === 'undefined') {
    console.log('No valid story URL provided, cannot open story');
    alert('אין סטורי זמין למשתמש זה');
    return;
  }
  
  // Lock body scroll immediately to prevent shaking
  document.body.classList.add('story-open');
  
  // Get story owner info first
  const storySection = document.querySelector(`[data-owner-id="${ownerId}"]`);
  if (storySection) {
    const username = storySection.querySelector('.story-label').textContent;
    const avatarUrl = storySection.querySelector('.story-photo').src;
    
    const storyOwnerUsername = document.getElementById('storyOwnerUsername');
    const storyOwnerAvatar = document.getElementById('storyOwnerAvatar');
    
    storyOwnerUsername.textContent = username;
    storyOwnerUsername.onclick = (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
      console.log('Username clicked - opening profile for:', ownerId);
      
      // Close the story overlay first so the modal can show
      const overlay = document.getElementById('storyOverlay');
      const storyImage = document.getElementById('storyImage');
      
      overlay.classList.remove('show');
      overlay.classList.add('d-none');
      
      storyImage.src = '';
      storyImage.classList.remove('loaded');
      
      document.getElementById('storyLoader').classList.add('d-none');
      document.body.classList.remove('story-open');
      
      // Then open the profile after a small delay
      setTimeout(() => {
        viewUserProfile(ownerId);
      }, 100);
    };
    
    storyOwnerAvatar.src = avatarUrl;
    // Remove avatar click handler - clicking avatar should only open story, not profile
  }
  
  // Show overlay immediately to prevent layout shift
  const overlay = document.getElementById('storyOverlay');
  overlay.classList.remove('d-none');
  
  // Show loader while image loads
  document.getElementById('storyLoader').classList.remove('d-none');
  
  // Preload image
  const img = new Image();
  img.onload = function() {
    // Update overlay content
    const storyImage = document.getElementById('storyImage');
    storyImage.src = storyUrl;
    
    // Hide loader
    document.getElementById('storyLoader').classList.add('d-none');
    
    // Force reflow and add show class for smooth transition
    overlay.offsetHeight;
    overlay.classList.add('show');
    
    // Add loaded class to image for animation
    setTimeout(() => {
      storyImage.classList.add('loaded');
    }, 50);
  };
  img.onerror = function() {
    console.error('Failed to load story image:', storyUrl);
    document.getElementById('storyLoader').classList.add('d-none');
    alert('שגיאה בטעינת התמונה');
    // Close overlay on error
    overlay.classList.remove('show');
    overlay.classList.add('d-none');
    // Restore body scroll on error
    document.body.classList.remove('story-open');
  };
  img.src = storyUrl;
}

// Handle story close button click - dedicated function to prevent profile opening
function handleStoryClose(event) {
  // Immediately stop all event propagation and prevent default
  event.stopPropagation();
  event.stopImmediatePropagation();
  event.preventDefault();
  
  console.log('Story close button clicked - closing story only');
  
  // Close the story immediately without any delays
  const overlay = document.getElementById('storyOverlay');
  const storyImage = document.getElementById('storyImage');
  
  // Hide overlay immediately
  overlay.classList.remove('show');
  overlay.classList.add('d-none');
  
  // Clear image source
  storyImage.src = '';
  storyImage.classList.remove('loaded');
  
  // Hide loader
  document.getElementById('storyLoader').classList.add('d-none');
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  console.log('Story closed successfully');
}

// Set up close button event listener when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.getElementById('storyCloseBtn');
  const backdrop = document.getElementById('storyBackdrop');
  
  // Make closeStory function global so it can be called from anywhere
  window.closeStory = function() {
    console.log('Closing story via event listener');
    
    const overlay = document.getElementById('storyOverlay');
    const storyImage = document.getElementById('storyImage');
    
    overlay.classList.remove('show');
    overlay.classList.add('d-none');
    
    storyImage.src = '';
    storyImage.classList.remove('loaded');
    
    document.getElementById('storyLoader').classList.add('d-none');
    document.body.classList.remove('story-open');
    
    console.log('Story closed successfully');
  };
  
  if (closeBtn) {
    closeBtn.addEventListener('click', function(event) {
      // Only handle if the click is directly on the close button or its icon
      if (event.target === closeBtn || event.target.closest('.story-close-btn')) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.preventDefault();
        
        console.log('Close button clicked');
        window.closeStory();
      }
    }, true); // Use capture phase to ensure this runs first
  }
  
  if (backdrop) {
    backdrop.addEventListener('click', function(event) {
      // Only handle if the click is directly on the backdrop, not on child elements
      if (event.target === backdrop) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.preventDefault();
        
        console.log('Backdrop clicked');
        window.closeStory();
      }
    }, true);
  }
  
  // Add click listener to the entire story overlay to close on any click
  const storyOverlay = document.getElementById('storyOverlay');
  if (storyOverlay) {
    storyOverlay.addEventListener('click', function(event) {
      // Don't close if clicking on interactive elements
      const interactiveElements = [
        'storyCloseBtn',
        'storyPrev', 
        'storyNext',
        'storyOwnerUsername',
        'storyOwnerAvatar'
      ];
      
      // Check if the clicked element or its parent is an interactive element
      let isInteractive = false;
      for (const elementId of interactiveElements) {
        const element = document.getElementById(elementId);
        if (element && (event.target === element || element.contains(event.target))) {
          isInteractive = true;
          break;
        }
      }
      
      // If not clicking on interactive elements, close the story
      if (!isInteractive) {
        console.log('Story overlay clicked - closing story');
        window.closeStory();
      }
    }, true);
  }
  
  // Add keyboard event listener for story navigation and closing
  document.addEventListener('keydown', function(event) {
    const storyOverlay = document.getElementById('storyOverlay');
    if (storyOverlay && !storyOverlay.classList.contains('d-none')) {
      // Story is open, handle navigation keys
      switch(event.key) {
        case 'Escape':
          console.log('Escape key pressed - closing story');
          window.closeStory();
          break;
        case 'ArrowLeft':
          console.log('Left arrow pressed - previous story');
          event.preventDefault(); // Prevent page scroll
          if (window.prevStory) {
            window.prevStory();
          }
          break;
        case 'ArrowRight':
          console.log('Right arrow pressed - next story');
          event.preventDefault(); // Prevent page scroll
          if (window.nextStory) {
            window.nextStory();
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          // Prevent page scroll when story is open
          event.preventDefault();
          break;
        case ' ': // Spacebar - next story
          console.log('Spacebar pressed - next story');
          event.preventDefault(); // Prevent page scroll
          if (window.nextStory) {
            window.nextStory();
          }
          break;
        case 'Backspace': // Backspace - previous story
          console.log('Backspace pressed - previous story');
          event.preventDefault(); // Prevent page back
          if (window.prevStory) {
            window.prevStory();
          }
          break;
        case 'Home': // Home - first story
          console.log('Home key pressed - first story');
          event.preventDefault();
          if (window.openStoryAt && globalStories && globalStories.length > 0) {
            window.openStoryAt(0);
          }
          break;
        case 'End': // End - last story
          console.log('End key pressed - last story');
          event.preventDefault();
          if (window.openStoryAt && globalStories && globalStories.length > 0) {
            window.openStoryAt(globalStories.length - 1);
          }
          break;
      }
    }
  });
});

// Close story overlay
function closeStoryOverlay() {
  console.log('Closing story overlay...');
  
  // Use the global closeStory function for consistency
  if (window.closeStory) {
    window.closeStory();
  } else {
    // Fallback if closeStory is not available
    const overlay = document.getElementById('storyOverlay');
    const storyImage = document.getElementById('storyImage');
    
    // Remove show class for fade-out effect
    overlay.classList.remove('show');
    
    // Wait for fade-out animation
    setTimeout(() => {
      overlay.classList.add('d-none');
      
      // Clear image source and remove loaded class
      storyImage.src = '';
      storyImage.classList.remove('loaded');
      
      // Hide loader
      document.getElementById('storyLoader').classList.add('d-none');
      
      // Restore body scroll
      document.body.classList.remove('story-open');
    }, 300);
  }
}

// Open story at specific index
function openStoryAt(index) {
  if (!globalStories[index]) {
    console.warn('openStoryAt: No story found at index:', index);
    return;
  }
  
  currentStoryIndex = index;
  const story = globalStories[index];
  
  console.log('Opening story at index:', index, story);
  
  // Check if story has a valid URL
  if (!story.storyImageUrl || story.storyImageUrl === null || story.storyImageUrl === undefined || story.storyImageUrl.trim() === '' || story.storyImageUrl === 'null' || story.storyImageUrl === 'undefined') {
    console.log('Story has no valid URL, cannot open story');
    alert('אין סטורי זמין למשתמש זה');
    return;
  }
  
  // Update overlay header
  const storyOwnerUsername = document.getElementById('storyOwnerUsername');
  const storyOwnerAvatar = document.getElementById('storyOwnerAvatar');
  
  storyOwnerUsername.textContent = story.username || 'משתמש';
  storyOwnerUsername.onclick = (event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.log('Username clicked - opening profile for:', story.ownerId);
    
    // Close the story overlay first so the modal can show
    const overlay = document.getElementById('storyOverlay');
    const storyImage = document.getElementById('storyImage');
    
    overlay.classList.remove('show');
    overlay.classList.add('d-none');
    
    storyImage.src = '';
    storyImage.classList.remove('loaded');
    
    document.getElementById('storyLoader').classList.add('d-none');
    document.body.style.overflow = '';
    
    // Then open the profile after a small delay
    setTimeout(() => {
      viewUserProfile(story.ownerId);
    }, 100);
  };
  
  storyOwnerAvatar.src = story.avatarUrl || '/images/profile.jpg';
  // Remove avatar click handler - clicking avatar should only open story, not profile
  
  // Show loader
  const loader = document.getElementById('storyLoader');
  const storyImage = document.getElementById('storyImage');
  loader.classList.remove('d-none');
  storyImage.classList.remove('loaded');
  
  // Load story image
  const img = new Image();
  img.onload = function() {
    storyImage.src = story.storyImageUrl;
    loader.classList.add('d-none');
    
    // Show overlay with fade-in effect
    const overlay = document.getElementById('storyOverlay');
    overlay.classList.remove('d-none');
    
    // Force reflow and add show class
    overlay.offsetHeight;
    overlay.classList.add('show');
    
    // Add loaded class to image for animation
    setTimeout(() => {
      storyImage.classList.add('loaded');
    }, 100);
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    
    // Mark as seen (only if it's not my own story)
    if (!story.isMe) {
      markStoryAsSeen(story.ownerId);
    }
    
    // Preload neighbor images
    preloadNeighborImages(index);
    
    // Update navigation buttons state
    updateNavigationState();
    
    // Focus management for accessibility
    setTimeout(() => {
      const closeBtn = document.querySelector('.story-close-btn');
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 100);
  };
  
  img.onerror = function() {
    loader.classList.add('d-none');
    showToast('שגיאה בטעינת התמונה', 'error');
    // Allow jumping to next story
    if (index + 1 < globalStories.length) {
      setTimeout(() => nextStory(), 1000);
    }
  };
  
  img.src = story.storyImageUrl;
}

// Navigate to previous story
function prevStory() {
  if (globalStories.length === 0) return;
  
  // Find the current story to check if it's "my story"
  const currentStory = globalStories[currentStoryIndex];
  const isMyStory = currentStory && currentStory.isMe;
  
  let prevIndex;
  if (isMyStory) {
    // If we're on "my story" (which appears at far right), go to the last non-my story
    prevIndex = globalStories.length - 2; 
  } else {
    // Normal navigation: go to previous story
    prevIndex = currentStoryIndex - 1;
    if (prevIndex < 0) {
      prevIndex = globalStories.length - 1; 
    }
  }
  
  if (globalStories[prevIndex]) {
    const prevStory = globalStories[prevIndex];
    if (prevStory.storyImageUrl && prevStory.storyImageUrl !== null && prevStory.storyImageUrl !== undefined && prevStory.storyImageUrl.trim() !== '' && prevStory.storyImageUrl !== 'null' && prevStory.storyImageUrl !== 'undefined') {
      openStoryAt(prevIndex);
    } else {
      console.log('Previous story has no valid URL, skipping');
    }
  }
}

// Navigate to next story
function nextStory() {
  if (globalStories.length === 0) return;
  
  // Find the current story to check if it's "my story"
  const currentStory = globalStories[currentStoryIndex];
  const isMyStory = currentStory && currentStory.isMe;
  
  let nextIndex;
  if (isMyStory) {
    // If we're on "my story" (which appears at far right), go to the first story
    nextIndex = 0; // First story
  } else {
    // Normal navigation: go to next story
    nextIndex = currentStoryIndex + 1;
    if (nextIndex >= globalStories.length) {
      nextIndex = globalStories.length - 1; // Go to my story 
    }
  }
  
  if (globalStories[nextIndex]) {
    const nextStory = globalStories[nextIndex];
    if (nextStory.storyImageUrl && nextStory.storyImageUrl !== null && nextStory.storyImageUrl !== undefined && nextStory.storyImageUrl.trim() !== '' && nextStory.storyImageUrl !== 'null' && nextStory.storyImageUrl !== 'undefined') {
      openStoryAt(nextIndex);
    } else {
      console.log('Next story has no valid URL, skipping');
    }
  }
}

// Preload neighbor images
function preloadNeighborImages(currentIndex) {
  if (!Array.isArray(globalStories) || globalStories.length === 0) return;
  
  const indices = [currentIndex - 1, currentIndex + 1];
  
  indices.forEach(index => {
    if (index >= 0 && index < globalStories.length) {
      const story = globalStories[index];
      if (story && story.storyImageUrl && story.storyImageUrl !== null && story.storyImageUrl !== undefined && story.storyImageUrl.trim() !== '' && story.storyImageUrl !== 'null' && story.storyImageUrl !== 'undefined') {
        preloadImage(story.storyImageUrl);
      }
    }
  });
}

// Update navigation buttons state
function updateNavigationState() {
  if (!Array.isArray(globalStories) || globalStories.length === 0) return;
  
  const prevBtn = document.getElementById('storyPrev');
  const nextBtn = document.getElementById('storyNext');
  
  if (prevBtn && nextBtn) {
    prevBtn.disabled = currentStoryIndex === 0;
    nextBtn.disabled = currentStoryIndex === globalStories.length - 1;
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.story-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `story-toast ${type}`;
  toast.textContent = message;
  
  // Add accessibility attributes
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-label', `Toast notification: ${message}`);
  toast.setAttribute('role', 'status');
  
  document.body.appendChild(toast);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Render suggestions
function renderSuggestions(suggestions) {
  const container = document.getElementById('suggestionsContainer');
  if (!container) {
    console.error(' Suggestions container not found!');
    return;
  }
  
  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted">
        <i class="bi bi-info-circle me-2"></i>
        אין הצעות להצגה כרגע
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  suggestions.forEach(suggestion => {
    const suggestionHTML = `
      <div class="d-flex align-items-center mb-3">
        <img src="${suggestion.avatarUrl || '/images/profile.jpg'}" 
             class="sidebar-user-img" 
             alt="${suggestion.username || 'User'}"
             onclick="viewUserProfile('${suggestion._id || ''}')"
             style="cursor: pointer;"
             onerror="this.src='/images/profile.jpg'" />
        <div class="flex-grow-1 ms-2">
          <strong onclick="viewUserProfile('${suggestion._id || ''}')" style="cursor: pointer;">${suggestion.username || 'משתמש'}</strong>
          ${suggestion.mutualFollowers ? `<br /><small class="text-muted">${suggestion.mutualFollowers}</small>` : ''}
        </div>
        <button class="follow-btn" data-username="${suggestion.username || 'user'}" data-user-id="${suggestion._id || ''}" aria-pressed="false" onclick="followUser('${suggestion._id || ''}', this)">מעקב</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', suggestionHTML);
  });
}

// Render posts
function renderPosts(posts) {
  console.log('=== RENDER POSTS CALLED ===');
  console.log('Posts received:', posts);
  console.log('Posts length:', posts?.length);
  console.log('Posts type:', typeof posts);
  
  const container = document.getElementById('postsContainer');
  if (!container) {
    console.error('postsContainer element not found!');
    return;
  }
  
  if (!posts || posts.length === 0) {
    console.log('No posts to render, showing empty message');
    container.innerHTML = `
      <div class="text-center text-muted mt-5">
        <h5>אין פוסטים להצגה</h5>
        <p>הפיד שלך ריק כי אין פוסטים של אנשים שאתה עוקב אחריהם</p>
        <p>התחל לעקוב אחרי אנשים כדי לראות את הפוסטים שלהם!</p>
      </div>
    `;
    return;
  }
  
  console.log('Rendering', posts.length, 'posts');
  container.innerHTML = '';
  posts.forEach((post, index) => {
    console.log(`Rendering post ${index + 1}:`, post);
    const postHTML = createPostHTML(post);
    container.insertAdjacentHTML('beforeend', postHTML);
  });
  
  // Initialize comment forms for new posts
  container.querySelectorAll(".post-container").forEach(post => {
    initializeCommentForm(post);
  });
}

// Check if current user is the owner of a post
function isPostOwner(post) {
  if (!window.currentUser?.userId) return false;
  
  // Compare with populated author._id or author string
  const postAuthorId = post.author?._id || post.author;
  return postAuthorId === window.currentUser.userId;
}

// Create post HTML
function createPostHTML(post) {
  console.log('Creating HTML for post:', post);
  console.log('Post mediaUrl:', post.mediaUrl);
  console.log('Post mediaType:', post.mediaType);
  
  const mediaHTML = post.mediaUrl ? 
    (post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.avi') || post.mediaUrl.includes('.mov') ?
      `<div class="post-media position-relative">
         <video class="post-video" autoplay muted loop playsinline>
           <source src="${post.mediaUrl}" type="video/mp4">
         </video>
         <button class="mute-btn" onclick="toggleMute(this)">
           <i class="bi bi-volume-mute"></i>
         </button>
       </div>` :
      `<div class="post-media">
         <img src="${post.mediaUrl}" alt="post image" onerror="console.error('Failed to load image:', this.src)" />
       </div>`
    ) : '';
  
  console.log('Generated mediaHTML:', mediaHTML);
  
  const hashtagsHTML = post.hashtags && post.hashtags.length > 0 ? 
    `<div class="hashtags mt-2">
       ${post.hashtags.map(tag => `<span class="badge bg-light text-dark me-1">#${tag}</span>`).join('')}
     </div>` : '';
  
  const createdAtHTML = post.createdAt ? 
    `<small class="text-muted d-block mt-2">${formatDate(post.createdAt)}</small>` : '';
  
  // Determine like state and count
  const likesArray = Array.isArray(post.likes) ? post.likes : [];
  // If server did not include likes array but we cached count, construct a virtual array length for display
  const currentUserId = window.currentUser?.userId;
  const userHasLiked = (typeof post._likedByMe === 'boolean')
    ? post._likedByMe
    : (currentUserId ? likesArray.some(l => (l?._id || l)?.toString?.() === currentUserId) : false);
  const likeIconClass = userHasLiked ? 'bi-heart-fill liked' : 'bi-heart';
  const likeCount = (typeof post._likeCount === 'number') 
    ? post._likeCount 
    : (likesArray.length || (typeof post.likes === 'number' ? post.likes : 0));

  // Always use the actual comments array length from database - ignore cached _commentCount
  const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;

  return `
    <div class="post-container mb-4" data-post-id="${post._id}">
      <div class="d-flex align-items-center justify-content-between mb-2 px-2">
        <div class="d-flex align-items-center">
          <img src="${post.author?.avatarUrl || '/images/profile.jpg'}" 
               class="profile-icon" 
               alt="${post.author?.username || 'User'}" 
               onclick="viewUserProfile('${post.author?._id || post.author || ''}')" 
               style="cursor: pointer;" />
          <span class="username-link fw-bold text-dark" onclick="viewUserProfile('${post.author?._id || post.author || ''}')" style="cursor: pointer;">${post.author?.username || 'משתמש'}</span>
        </div>
        <div class="dropdown">
          <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-three-dots"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            ${isPostOwner(post) ? `
              <li><a class="dropdown-item" onclick="editPost(this)" data-post-id="${post._id}"><i class="bi bi-pencil-square me-2"></i>ערוך פוסט</a></li>
              <li><a class="dropdown-item text-danger" onclick="deletePost(this)" data-post-id="${post._id}"><i class="bi bi-trash me-2"></i>מחק פוסט</a></li>
            ` : `
              <li><a class="dropdown-item text-danger" onclick="reportPost(this)" data-post-id="${post._id}"><i class="bi bi-flag me-2"></i>דווח על פוסט</a></li>
            `}
          </ul>
        </div>
      </div>
      ${mediaHTML}
      <div class="d-flex justify-content-between align-items-center px-3 py-2 icons">
        <div>
          <i class="bi ${likeIconClass} like-icon" onclick="toggleLike(this)"></i>
          <span class="like-count">${likeCount}</span>
          <i class="bi bi-chat chat-icon" onclick="focusComment(this)"></i>
          <span class="comment-count-icon">${commentCount}</span>
          <i class="bi bi-send ms-2 share-icon" onclick="openShareModal(event)" style="cursor:pointer;"></i> 
          <span class="share-count">${(post.shareCount ?? (post.shares?.length)) || 0}</span>
        </div>
        <i class="bi bi-bookmark bookmark-icon" onclick="toggleBookmark(this)"></i>
      </div>
      <div class="px-3 pb-3 pt-1 post-caption">
        <strong class="username" onclick="viewUserProfile('${post.author?._id || post.author || ''}')" style="cursor: pointer;">${post.author?.username || 'משתמש'}</strong> 
        <span class="post-text" dir="rtl">${post.content || post.title || ''}</span>
        ${hashtagsHTML}
        ${createdAtHTML}
      </div>
      <div class="px-3 pb-3">
        <button class="btn btn-link p-0 mb-2 comment-toggle-btn" onclick="toggleComments(this)">
          הצג תגובות (<span class="comment-count">${commentCount}</span>)
        </button>
        <div class="comments-list d-none">
                          ${post.comments ? (() => {
          console.log('Rendering comments for post:', post._id || post.id);
          console.log('Comments array:', post.comments);
          console.log('Comments count:', post.comments?.length);
          
          // Filter out comments without valid IDs
          const validComments = post.comments.filter(comment => {
            const hasId = comment._id || comment.id;
            if (!hasId) {
              console.warn(' Comment missing ID, skipping:', comment);
              return false;
            }
            return true;
          });
          
          if (validComments.length === 0) {
            console.log('No valid comments to render');
            return '';
          }
          
          return validComments.map(comment => {
            // Log comment data for debugging
            console.log('Processing comment:', { 
              comment,
              _id: comment._id,
              id: comment.id,
              hasId: !!(comment._id || comment.id)
            });
            console.log('Rendering comment:', { 
              commentId: comment._id || comment.id, 
              content: comment.content?.substring(0, 20),
              author: comment.author?.username
            });
            
            const isCommentOwner = currentUser && (comment.author?._id === currentUser.id || comment.author?.id === currentUser.id);
            const isPostOwner = currentUser && (post.author?._id === currentUser.id || post.author?.id === currentUser.id);
            const canDelete = isCommentOwner || isPostOwner;
            
            // Detect text direction for the comment content
            const hasHebrew = /[\u0590-\u05FF]/.test(comment.content);
            const hasArabic = /[\u0600-\u06FF]/.test(comment.content);
            const hasEnglish = /[a-zA-Z]/.test(comment.content);
            
            let contentDir = 'auto';
            if (hasHebrew || hasArabic) {
              contentDir = 'rtl';
            } else if (hasEnglish && !hasHebrew && !hasArabic) {
              contentDir = 'ltr';
            }
            
            // For Hebrew/Arabic content, use RTL text alignment but keep RTL layout
            let textAlign = 'right';
            if (contentDir === 'ltr') {
              textAlign = 'left';
            }
            
            // Get comment ID - we know it exists from filtering
            const commentId = comment._id || comment.id;
            console.log('Using comment ID:', commentId, {
              original_id: comment._id,
              fallback_id: comment.id,
              final_id: commentId,
              type: typeof commentId
            });
            
            return `
              <div class="comment-item" data-comment-id="${commentId}">
                <div class="comment-text-group">
                  <span class="comment-content" dir="${contentDir}" style="text-align: ${textAlign};">${comment.content}</span>
                  <span class="comment-username" onclick="viewUserProfile('${comment.author?._id || comment.author || ''}')" style="cursor: pointer;">:${comment.author?.username || 'משתמש'}</span>
                </div>
                ${canDelete ? `<button class="delete-comment-btn" onclick="deleteComment(this)" title="מחק תגובה">×</button>` : ''}
              </div>
            `;
          }).join('');
        })() : ''}
        </div>
        <div class="comment-form d-flex align-items-center px-3">
          <input type="text" class="comment-input-simple flex-grow-1" placeholder="הוסף תגובה..." />
          <button class="send-btn ms-2 d-none" onclick="addComment(this)">פרסום</button>
        </div>
        <div class="typing-status text-muted small mt-1 mb-2 d-none">
          ${currentUser?.username || 'משתמש'} כותב תגובה...
        </div>
      </div>
    </div>
  `;
}

// Render share users
function renderShareUsers(users) {
  const container = document.getElementById('shareUsersContainer');
  if (!container) return;
  
  if (!users || users.length === 0) {
    container.innerHTML = '<div class="text-center text-muted">אין עוקבים להצגה</div>';
    return;
  }
  
  console.log('Rendering share users:', users); // Debug
  
  container.innerHTML = '';
  users.forEach(user => {
    // Handle different user object structures
    const username = user.username || user.name || 'משתמש';
    let avatarUrl = user.avatarUrl || user.avatar || user.profilePicture;
    
    // If no avatar, use a placeholder avatar service
    if (!avatarUrl || avatarUrl === '' || avatarUrl === 'images/profile.jpg') {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=48&rounded=true`;
    }
    
    const userId = user.id || user._id || '';
    
    console.log('Rendering user:', { username, avatarUrl, userId }); // Debug
    
    const userHTML = `
      <div class="share-user-item" onclick="selectShareUser(this, '${username}')">
        <div class="share-user-avatar">
          <img src="${avatarUrl}" 
               alt="${username}" 
               class="rounded-circle"
               onerror="this.src='images/profile.jpg'">
          <div class="selection-indicator"></div>
        </div>
        <div class="share-user-info">
          <div class="share-user-name">${username}</div>
          <div class="share-user-status">לחץ לשיתוף</div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', userHTML);
  });
}

// Format date helper
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return 'לפני כמה דקות';
  } else if (diffInHours < 24) {
    return `לפני ${Math.floor(diffInHours)} שעות`;
  } else if (diffInHours < 48) {
    return 'אתמול';
  } else {
    return date.toLocaleDateString('he-IL');
  }
}

function toggleMute(button) {
const video = button.previousElementSibling;
video.muted = !video.muted;

const icon = button.querySelector("i");
if (video.muted) {
  icon.classList.remove("bi-volume-up");
  icon.classList.add("bi-volume-mute");
} else {
  icon.classList.remove("bi-volume-mute");
  icon.classList.add("bi-volume-up");
}
}

// Report post function
function reportPost(element) {
  // Prevent default action to avoid page jump
  event.preventDefault();
  
  const post = element.closest('.post-container');
  const postId = post.dataset.postId;
  
  if (!postId) {
    showToast('שגיאה: לא ניתן לזהות את הפוסט', 'error');
    return;
  }
  
  // Disable the report button to prevent spam
  const reportItem = element.closest('li');
  const reportLink = element;
  
  // Disable the item
  reportItem.style.opacity = '0.5';
  reportItem.style.pointerEvents = 'none';
  reportLink.style.cursor = 'not-allowed';
  
  // Show success toast
  showToast('הפוסט דווח בהצלחה', 'success');
  
  // Optional: Send report to backend (non-blocking)
  reportPostToBackend(postId).catch(error => {
    console.error('Error reporting post to backend:', error);
    // Don't show error to user - keep the success experience
  });
  
  // Re-enable after 3 seconds
  setTimeout(() => {
    reportItem.style.opacity = '1';
    reportItem.style.pointerEvents = 'auto';
    reportLink.style.cursor = 'pointer';
  }, 3000);
}

// Send report to backend (non-blocking)
async function reportPostToBackend(postId) {
  try {
    const token = getToken();
    if (!token) return; // Silently fail if no token
    
    await fetch(`/api/posts/${postId}/report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    // Ignore response - we don't want to block the UI
  } catch (error) {
    // Silently fail - don't affect user experience
    console.error('Report backend error:', error);
  }
}

// Delete post function
async function deletePost(element) {
  // Prevent default action to avoid page jump
  event.preventDefault();
  
  const post = element.closest('.post-container');
  const postId = post.dataset.postId;
  
  if (!postId) {
    showToast('שגיאה: לא ניתן לזהות את הפוסט', 'error');
    return;
  }
  
  if (confirm('האם אתה בטוח שברצונך למחוק פוסט זה?')) {
    try {
      const token = getToken();
      if (!token) {
        showToast('שגיאה: לא מחובר למערכת', 'error');
        return;
      }
      
      console.log('Deleting post:', {
        postId: postId,
        token: token ? 'EXISTS' : 'MISSING',
        tokenLength: token ? token.length : 0
      });
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Delete response:', {
        status: response.status,
        ok: response.ok
      });
      
      if (response.ok) {
        post.remove();
        showToast('הפוסט נמחק בהצלחה', 'success');
      } else if (response.status === 403) {
        const errorData = await response.json();
        console.log('403 Error:', errorData);
        showToast('אתה יכול לשנות רק את הפוסטים שלך', 'error');
      } else {
        const errorData = await response.json();
        console.log('Other Error:', errorData);
        showToast(`שגיאה במחיקת הפוסט: ${errorData.error || 'שגיאה לא ידועה'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('שגיאה במחיקת הפוסט', 'error');
    }
  }
}

// Edit post function
function editPost(element) {
  event.preventDefault();
  const post = element.closest('.post-container');
  const captionElement = post.querySelector('.post-caption');
  const postTextElement = captionElement.querySelector('.post-text');
  const originalHTML = postTextElement.innerHTML;
  const originalDir = postTextElement.getAttribute('dir');

  // Helper: Recursively extract text with newlines for <br> and block elements
  function extractTextWithNewlines(node) {
    let text = '';
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'BR') {
          text += '\n';
        } else if (["LI", "P", "DIV", "UL", "OL"].includes(child.tagName)) {
          text += (text && !text.endsWith('\n')) ? '\n' : '';
          text += extractTextWithNewlines(child);
          text += '\n';
        } else {
          text += extractTextWithNewlines(child);
        }
      }
    });
    return text;
  }

  // Get plain text for editing
  let plainText = extractTextWithNewlines(postTextElement).replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');

  // Create textarea for editing
  const textarea = document.createElement('textarea');
  textarea.className = 'form-control mb-2';
  textarea.value = plainText;

  // Create save and cancel buttons
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary btn-sm me-2';
  saveBtn.textContent = 'שמור';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary btn-sm';
  cancelBtn.textContent = 'ביטול';
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'd-flex justify-content-end';
  buttonContainer.appendChild(saveBtn);
  buttonContainer.appendChild(cancelBtn);

  postTextElement.classList.add('d-none');
  captionElement.appendChild(textarea);
  captionElement.appendChild(buttonContainer);
  textarea.focus();

  function updateTextNodes(node, lines) {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent = lines.length ? lines.shift() : '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'BR') {
          if (lines.length && lines[0] === '') lines.shift();
        } else if (["LI", "P", "DIV", "UL", "OL"].includes(child.tagName)) {
          if (lines.length && lines[0] === '') lines.shift();
          updateTextNodes(child, lines);
          if (lines.length && lines[0] === '') lines.shift();
        } else {
          updateTextNodes(child, lines);
        }
      }
    });
  }

  saveBtn.onclick = async function() {
    // Add yellow fill effect when clicked
    saveBtn.style.backgroundColor = '#ffd700';
    saveBtn.style.borderColor = '#ffd700';
    saveBtn.style.color = '#000';
    
    let newText = textarea.value;
    
    try {
      const token = getToken();
      if (!token) {
        showToast('שגיאה: לא מחובר למערכת', 'error');
        return;
      }
      
      const postId = post.dataset.postId;
      if (!postId) {
        showToast('שגיאה: לא ניתן לזהות את הפוסט', 'error');
        return;
      }
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newText
        })
      });
      
      if (response.ok) {
        const updatedPost = await response.json();
        
        // Update the post content
        let lines = newText.replace(/\r/g, '').split('\n');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        updateTextNodes(tempDiv, lines);
        // If there are leftover lines, append them as <br>-separated text
        if (lines.length > 0) {
          let extra = '';
          for (let i = 0; i < lines.length; i++) {
            if (i > 0) extra += '<br>';
            extra += lines[i];
          }
          tempDiv.innerHTML += extra ? '<br>' + extra : '';
        }
        postTextElement.innerHTML = tempDiv.innerHTML;
        const isRTL = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(newText);
        if (isRTL) {
          postTextElement.setAttribute('dir', 'rtl');
        } else {
          postTextElement.setAttribute('dir', 'ltr');
        }
        postTextElement.classList.remove('d-none');
        textarea.remove();
        buttonContainer.remove();
        
        showToast('הפוסט נערך בהצלחה', 'success');
      } else if (response.status === 403) {
        showToast('אתה יכול לשנות רק את הפוסטים שלך', 'error');
      } else {
        const errorData = await response.json();
        showToast(`שגיאה בעריכת הפוסט: ${errorData.error || 'שגיאה לא ידועה'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      showToast('שגיאה בעריכת הפוסט', 'error');
    } finally {
      // Reset button color after operation completes
      setTimeout(() => {
        saveBtn.style.backgroundColor = '';
        saveBtn.style.borderColor = '';
        saveBtn.style.color = '';
      }, 1000); // Reset after 1 second
    }
  };

  cancelBtn.onclick = function() {
    postTextElement.innerHTML = originalHTML;
    if (originalDir) {
      postTextElement.setAttribute('dir', originalDir);
    } else {
      postTextElement.removeAttribute('dir');
    }
    postTextElement.classList.remove('d-none');
    textarea.remove();
    buttonContainer.remove();
  };

  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveBtn.click();
    } else if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
}

// Bookmark toggle function
function toggleBookmark(icon) {
  // Prevent default action to avoid page jump
  event.preventDefault();
  
  // Toggle between outline and filled bookmark icons
  icon.classList.toggle("bi-bookmark");
  icon.classList.toggle("bi-bookmark-fill");
  
  // Add visual feedback with color change
  if (icon.classList.contains("bi-bookmark-fill")) {
    icon.style.color = "#262626"; // Dark color when saved
  } else {
    icon.style.color = ""; // Default color when not saved
  }
}

// Post Creation Functions
let selectedImageFile = null;

// Open create post modal
function openCreatePostModal() {
  event.preventDefault();
  const modal = new bootstrap.Modal(document.getElementById('createPostModal'));
  modal.show();
}

// Preview uploaded media (image or video)
function previewMedia(input) {
  const file = input.files[0];
  if (file) {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert(`הקובץ גדול מדי. גודל מקסימלי: 10MB. הקובץ הנוכחי: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      input.value = '';
      return;
    }
    
    selectedMediaFile = file;
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      // Hide both previews initially
      document.getElementById('previewImg').classList.add('d-none');
      document.getElementById('previewVideo').classList.add('d-none');
      
      if (isVideo) {
        // Show video preview
        const videoElement = document.getElementById('previewVideo');
        videoElement.src = e.target.result;
        videoElement.classList.remove('d-none');
        console.log('Video preview loaded:', file.name, file.type);
      } else if (isImage) {
        // Show image preview
        const imgElement = document.getElementById('previewImg');
        imgElement.src = e.target.result;
        imgElement.classList.remove('d-none');
        console.log('Image preview loaded:', file.name, file.type);
      }
      
      // Show file information
      const fileSize = (file.size / (1024 * 1024)).toFixed(1);
      const mediaInfo = document.getElementById('mediaInfo');
      mediaInfo.textContent = `${file.name} (${fileSize}MB)`;
      
      // Show media preview container
      document.getElementById('mediaPreview').classList.remove('d-none');
    };
    
    reader.readAsDataURL(file);
  }
}

// Remove selected media
function removeMedia() {
  selectedMediaFile = null;
  document.getElementById('postMedia').value = '';
  document.getElementById('mediaPreview').classList.add('d-none');
  document.getElementById('previewImg').src = '';
  document.getElementById('previewVideo').src = '';
  document.getElementById('previewImg').classList.add('d-none');
  document.getElementById('previewVideo').classList.add('d-none');
  document.getElementById('mediaInfo').textContent = '';
}

// Facebook sharing functions
function toggleFacebookShare() {
  const facebookBtn = document.querySelector('.btn-facebook-share');
  shouldShareToFacebook = !shouldShareToFacebook;
  
  if (shouldShareToFacebook) {
    facebookBtn.classList.add('active');
    facebookBtn.title = 'ביטול שיתוף בפייסבוק';
    facebookShareConfirmed = false; // Reset confirmation when toggling on
  } else {
    facebookBtn.classList.remove('active');
    facebookBtn.title = 'שתף גם בפייסבוק';
    facebookShareConfirmed = false; // Reset confirmation when toggling off
  }
}

function confirmFacebookShare() {
  shouldShareToFacebook = true;
  facebookShareConfirmed = true; // Mark that user confirmed Facebook sharing
  
  // Close the confirmation modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('facebookShareModal'));
  if (modal) {
    modal.hide();
  }
  
  // Proceed with post creation
  publishPost();
}

function cancelFacebookShare() {
  // Reset Facebook sharing state when user cancels
  shouldShareToFacebook = false;
  facebookShareConfirmed = false;
  
  // Update button state
  const facebookBtn = document.querySelector('.btn-facebook-share');
  if (facebookBtn) {
    facebookBtn.classList.remove('active');
    facebookBtn.title = 'שתף גם בפייסבוק';
  }
  
  // Close the confirmation modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('facebookShareModal'));
  if (modal) {
    modal.hide();
  }
}

async function shareToFacebook(postData) {
  try {
    const token = getToken();
    if (!token) {
      console.error('No authentication token available for Facebook sharing');
      return;
    }

    const response = await fetch('/api/facebook/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        postId: postData._id,
        content: postData.content,
        mediaUrl: postData.mediaUrl,
        mediaType: postData.mediaType
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Post shared to Facebook successfully:', result.data);
      showFacebookShareNotification(true);
    } else {
      console.error('Failed to share to Facebook:', result.error);
      showFacebookShareNotification(false, result.details);
    }
  } catch (error) {
    console.error('Error sharing to Facebook:', error);
    showFacebookShareNotification(false, error.message);
  }
}

function showFacebookShareNotification(success, errorMessage = '') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${success ? 'success' : 'warning'} alert-dismissible fade show position-fixed`;
  notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  
  const icon = success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
  const message = success ? 
    'הפוסט שותף בפייסבוק בהצלחה!' : 
    `שגיאה בשיתוף לפייסבוק: ${errorMessage}`;
  
  notification.innerHTML = `
    <i class="bi ${icon} me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Publish new post
async function publishPost() {
  const caption = document.getElementById('postCaption').value.trim();
  
  if (!caption) {
    alert('אנא הכנס כיתוב לפוסט');
    return;
  }
  
  // Check if Facebook sharing is requested but not confirmed yet
  const facebookBtn = document.querySelector('.btn-facebook-share');
  if (facebookBtn && facebookBtn.classList.contains('active') && shouldShareToFacebook && !facebookShareConfirmed) {
    // Show Facebook confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('facebookShareModal'));
    modal.show();
    return;
  }
  
  try {
    const token = getToken();
    if (!token) {
      alert('אין לך הרשאה ליצור פוסט. אנא התחבר מחדש.');
      return;
    }
    
    console.log('Creating post with caption:', caption);
    console.log('Selected media file:', selectedMediaFile);
    
    const formData = new FormData();
    formData.append('content', caption);
    
    if (selectedMediaFile) {
      formData.append('image', selectedMediaFile);
      console.log('Media file appended to form data:', selectedMediaFile.name, selectedMediaFile.type);
    }
    
    console.log('Sending request to /api/posts...');
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      
      if (response.status === 401) {
        alert('הסשן פג תוקף. אנא התחבר מחדש.');
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("username");
        window.location.href = "index.html";
        return;
      } else if (response.status === 400) {
        alert(`שגיאה בנתונים: ${errorText}`);
      } else if (response.status === 500) {
        alert('שגיאה בשרת. אנא נסה שוב מאוחר יותר.');
      } else {
        alert(`שגיאה ביצירת הפוסט: ${response.status} - ${errorText}`);
      }
      return;
    }
    
    const newPost = await response.json();
    console.log('New post created successfully:', newPost);
    
    // Ensure the new post has your username for proper filtering
    const currentUsername = extractUsernameFromToken(token);
    if (currentUsername && !newPost.author?.username) {
      newPost.author = { ...newPost.author, username: currentUsername };
      console.log('Updated new post with current username:', currentUsername);
    }
    
    // Add to current posts and re-render
    currentPosts.unshift(newPost); // Add new post to the beginning (top)
    
    // Sort posts by creation date to ensure newest is first
    currentPosts.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB - dateA; // Newest first
    });
    
    renderPosts(currentPosts);
    
    // Save to localStorage to persist posts after refresh
    try {
      localStorage.setItem('feed_posts', JSON.stringify(currentPosts));
      console.log('Posts saved to localStorage for persistence');
    } catch (e) {
      console.warn('Failed to save posts to localStorage:', e);
    }
    
    // Reset form and close modal
    document.getElementById('createPostForm').reset();
    removeMedia();
    const modal = bootstrap.Modal.getInstance(document.getElementById('createPostModal'));
    if (modal) {
      modal.hide();
    }
    
    // Show notification
    showPostNotification();
    
    // Share to Facebook if requested
    if (shouldShareToFacebook) {
      await shareToFacebook(newPost);
    }
    
    // Reset Facebook sharing state
    shouldShareToFacebook = false;
    facebookShareConfirmed = false;
    const facebookBtn = document.querySelector('.btn-facebook-share');
    if (facebookBtn) {
      facebookBtn.classList.remove('active');
      facebookBtn.title = 'שתף גם בפייסבוק';
    }
    
    // Scroll to top to show new post
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
      // Show success message
  alert('הפוסט נוצר בהצלחה!');
  
} catch (error) {
    console.error('Error creating post:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      alert('שגיאה בחיבור לשרת. אנא ודא שהשרת פועל.');
    } else {
      alert(`שגיאה ביצירת הפוסט: ${error.message}`);
    }
  }
}

// Initialize comment form for a specific post
function initializeCommentForm(post) {
  const form = post.querySelector(".comment-form");
  const input = form.querySelector(".comment-input-simple");
  const btn = form.querySelector(".send-btn");
  const indicator = post.querySelector(".typing-status");

  btn.classList.add("d-none");
  if (indicator) indicator.classList.add("d-none");

  let typingTimeout;

  input.addEventListener("input", () => {
    const hasText = input.value.trim() !== "";
    btn.classList.toggle("d-none", !hasText);

    if (hasText) {
      indicator.classList.remove("d-none");
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        indicator.classList.add("d-none");
      }, 1000);
    } else {
      indicator.classList.add("d-none");
      clearTimeout(typingTimeout);
    }
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      btn.click();
    }
  });
}

// Show post notification
function showPostNotification() {
  const toast = new bootstrap.Toast(document.getElementById('postNotification'));
  toast.show();
}

// Confirm account deletion
function confirmDeleteAccount() {
  const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
  modal.show();
}

// Proceed with account deletion after confirmation
function proceedWithAccountDeletion() {
  // Close the confirmation modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal'));
  modal.hide();
  
  // Proceed with deletion
  deleteUserAccount();
}

// Delete user account
async function deleteUserAccount() {
  try {
    const token = getToken();
    if (!token) {
      alert('אין לך הרשאה למחוק את החשבון. אנא התחבר מחדש.');
      return;
    }

    // Show loading state
    const deleteBtn = document.querySelector('.btn-delete-account');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>מוחק חשבון...';
    deleteBtn.disabled = true;

    console.log('Deleting user account...');
    
    const response = await fetch('/api/users/me', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      console.log('Account deleted successfully');
      
      // Clear all local data
      localStorage.clear();
      sessionStorage.clear();
      
      // Show success message before redirect
      alert('החשבון נמחק בהצלחה. אתה מועבר לדף הכניסה...');
      
      // Redirect to index.html
      window.location.href = 'index.html';
    } else {
      const errorData = await response.json();
      console.error(' Failed to delete account:', errorData);
      alert(`שגיאה במחיקת החשבון: ${errorData.error || 'שגיאה לא ידועה'}`);
      
      // Reset button
      deleteBtn.innerHTML = originalText;
      deleteBtn.disabled = false;
    }
  } catch (error) {
    console.error(' Error deleting account:', error);
    alert(`שגיאה במחיקת החשבון: ${error.message}`);
    
    // Reset button
    const deleteBtn = document.querySelector('.btn-delete-account');
    deleteBtn.innerHTML = '<i class="bi bi-trash-fill me-2"></i>מחק חשבון לצמיתות';
    deleteBtn.disabled = false;
  }
}

// Share Post Functions
let selectedShareUser = null;
let currentSharePost = null;

// Open share modal and track the post being shared
function openShareModal(event) {
  if (event) event.preventDefault();
  // Find the post being shared
  const post = event && event.target ? event.target.closest('.post-container') : null;
  currentSharePost = post;
  const modal = new bootstrap.Modal(document.getElementById('sharePostModal'));
  modal.show();
  // Reset selection when opening
  selectedShareUser = null;
  document.querySelectorAll('.share-user-item').forEach(item => {
    item.classList.remove('selected');
  });
  // Load following users for sharing
  loadFollowingUsersForShare();
}

// Select share user and immediately share
function selectShareUser(element, username) {
  // Remove previous selection
  document.querySelectorAll('.share-user-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Add selection to clicked element
  element.classList.add('selected');
  selectedShareUser = username;
  
  // Show visual feedback briefly
  setTimeout(() => {
    // Immediately share the post
    sharePostWithUser(username);
  }, 300);
}

// Share post with selected user
async function sharePostWithUser(username) {
  try {
    // Get post ID from the current post
    const postId = currentSharePost ? currentSharePost.dataset.postId : null;
    
    if (!postId) {
      console.error('No post ID found');
      showShareSuccessModal(); // Still show success for UX
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      showShareSuccessModal(); // Still show success for UX
      return;
    }

    // Send share request to API
    const response = await fetch(`/api/posts/${postId}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetUserId: username // The user we're sharing with
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Post shared successfully:', data);
      
      // Update the share count in the UI with the real count from DB
      if (currentSharePost && (data.shareCount || (data.data && data.data.shareCount))) {
        const newCount = data.shareCount ?? (data.data && data.data.shareCount) ?? 0;
        let shareCountSpan = currentSharePost.querySelector('.share-count');
        if (shareCountSpan) shareCountSpan.textContent = newCount;
      }
    } else {
      console.error('Failed to share post:', response.status);
      // Still update UI for user experience
      if (currentSharePost) {
        let shareCountSpan = currentSharePost.querySelector('.share-count');
        let count = shareCountSpan ? parseInt(shareCountSpan.textContent) || 0 : 0;
        count++;
        if (shareCountSpan) shareCountSpan.textContent = count;
      }
    }
  } catch (error) {
    console.error('Error sharing post:', error);
    // Still update UI for user experience
    if (currentSharePost) {
      let shareCountSpan = currentSharePost.querySelector('.share-count');
      let count = shareCountSpan ? parseInt(shareCountSpan.textContent) || 0 : 0;
      count++;
      if (shareCountSpan) shareCountSpan.textContent = count;
    }
  }
  
  // Close share modal first
  const modal = bootstrap.Modal.getInstance(document.getElementById('sharePostModal'));
  modal.hide();
  
  // Show success message after modal closes
  setTimeout(() => {
    showShareSuccessModal();
  }, 300);
  
  // Reset variables
  selectedShareUser = null;
  currentSharePost = null;
}

// Filter share users
function filterShareUsers(searchTerm) {
  const userItems = document.querySelectorAll('.share-user-item');
  
  userItems.forEach(item => {
    const userName = item.querySelector('.share-user-name').textContent.toLowerCase();
    const displayName = item.querySelector('.share-user-name').textContent;
    
    if (userName.includes(searchTerm.toLowerCase()) || displayName.includes(searchTerm)) {
      item.classList.remove('d-none');
    } else {
      item.classList.add('d-none');
    }
  });
}

// Load following users for sharing
async function loadFollowingUsersForShare() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const response = await fetch('/api/users/me/following', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const followingUsers = data.data || data.following || [];
      renderShareUsers(followingUsers);
    } else {
      console.error('Error loading following users:', response.status);
      // Fallback to suggestions if following API fails
      loadAllUsersForShare();
    }
  } catch (error) {
    console.error('Error loading following users:', error);
    // Fallback to suggestions if API fails
    loadAllUsersForShare();
  }
}

// Load all users as fallback for sharing
async function loadAllUsersForShare() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const response = await fetch('/api/users/search', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const allUsers = data.data || data.users || [];
      console.log('Loaded all users for share:', allUsers);
      renderShareUsers(allUsers);
    } else {
      console.error('Error loading all users:', response.status);
      renderShareUsers([]);
    }
  } catch (error) {
    console.error('Error loading all users:', error);
    renderShareUsers([]);
  }
}

// Send share message
function sendShareMessage() {
  if (!selectedShareUser) {
    showShareSuccessModal();
    return;
  }
  // Only update the share count for the relevant post
  if (currentSharePost) {
    let shareCountSpan = currentSharePost.querySelector('.share-count');
    let count = shareCountSpan ? parseInt(shareCountSpan.textContent) || 0 : 0;
    count++;
    if (shareCountSpan) shareCountSpan.textContent = count;
  }
  
  // Show success message
  showShareSuccessModal();
  
  // Close share modal and reset
  const modal = bootstrap.Modal.getInstance(document.getElementById('sharePostModal'));
  modal.hide();
  selectedShareUser = null;
  currentSharePost = null;
}

// Show share success modal
function showShareSuccessModal() {
  const successModal = new bootstrap.Modal(document.getElementById('shareSuccessModal'));
  successModal.show();
  
  // Auto close after 2 seconds
  setTimeout(() => {
    successModal.hide();
  }, 2000);
}

// --- Filter logic ---
let currentFilterType = 'all';
let lastSearchTerm = '';

function filterPostsByType(type) {
  currentFilterType = type;
  applyFilters();
}

// Patch: keep search and filter working together
function filterPosts(searchTerm) {
  lastSearchTerm = searchTerm;
  applyFilters();
}

function applyFilters() {
  const posts = document.querySelectorAll('.post-container');
  const searchLower = lastSearchTerm.toLowerCase().trim();

  posts.forEach(post => {
    // --- FILTER BY TYPE ---
    let show = true;
    const hasVideo = post.querySelector('video');
    const hasImg = post.querySelector('.post-media img');
    const captionElement = post.querySelector('.post-caption');
    const postTextElement = captionElement ? captionElement.querySelector('.post-text') : null;
    const captionText = postTextElement ? (postTextElement.textContent || postTextElement.innerText) : '';
    const hasText = captionText.trim().length > 0;

    if (currentFilterType === 'text') {
      show = hasText && !hasImg && !hasVideo;
    } else if (currentFilterType === 'video') {
      show = !!hasVideo;
    } else if (currentFilterType === 'image') {
      show = !!hasImg && !hasVideo;
    } // else 'all' => show = true

    // --- FILTER BY SEARCH ---
    if (show && searchLower && postTextElement) {
      // Get the original HTML content if not already stored
      if (!postTextElement.getAttribute('data-original-html')) {
        postTextElement.setAttribute('data-original-html', postTextElement.innerHTML);
      }
      const originalHTML = postTextElement.getAttribute('data-original-html');
      const textContent = postTextElement.textContent || postTextElement.innerText;
      const textContentLower = textContent.toLowerCase();
      if (textContentLower.includes(searchLower)) {
        // Highlight searched text
        const highlightedHTML = highlightTextInHTML(originalHTML, lastSearchTerm);
        postTextElement.innerHTML = highlightedHTML;
      } else {
        // Restore original HTML when search is cleared or not matching
        postTextElement.innerHTML = originalHTML;
        show = false;
      }
    } else if (postTextElement) {
      // Restore original HTML if not searching
      if (postTextElement.getAttribute('data-original-html')) {
        postTextElement.innerHTML = postTextElement.getAttribute('data-original-html');
      }
    }

    post.style.display = show ? 'block' : 'none';
  });
}

// Function to open advanced search modal
function openAdvancedSearchModal() {
  // Reset form
  document.getElementById('searchUsername').value = '';
  document.getElementById('postTypeAll').checked = true;
  document.getElementById('minLikes').value = '';
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('advancedSearchModal'));
  modal.show();
}

// Function to open advanced group search modal
function openAdvancedGroupSearchModal() {
  // Close the main search modal first
  const searchModal = bootstrap.Modal.getInstance(document.getElementById('searchModal'));
  if (searchModal) {
    searchModal.hide();
  }
  
  // Reset form
  document.getElementById('searchGroupAdmin').value = '';
  document.getElementById('groupCreationYear').value = '';
  document.getElementById('minMemberCount').value = '';
  document.getElementById('maxMemberCount').value = '';
  
  // Show advanced search modal with a small delay to ensure smooth transition
  setTimeout(() => {
    const modal = new bootstrap.Modal(document.getElementById('advancedGroupSearchModal'));
    modal.show();
  }, 300);
}

// Function to perform advanced search
function performAdvancedSearch() {
  const username = document.getElementById('searchUsername').value.trim();
  const postType = document.querySelector('input[name="postType"]:checked').value;
  const minLikes = document.getElementById('minLikes').value.trim();
  
  console.log('Advanced search:', { username, postType, minLikes });
  
  // Apply advanced filters
  applyAdvancedFilters(username, postType, minLikes);
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('advancedSearchModal'));
  modal.hide();
}

// Function to perform advanced group search
async function performAdvancedGroupSearch() {
  try {
    const adminName = document.getElementById('searchGroupAdmin').value.trim();
    const creationYear = document.getElementById('groupCreationYear').value.trim();
    const minMembers = document.getElementById('minMemberCount').value.trim();
    const maxMembers = document.getElementById('maxMemberCount').value.trim();
    
    // Validate inputs
    if (!adminName && !creationYear && !minMembers && !maxMembers) {
      console.log('אנא מלא לפחות שדה אחד לחיפוש');
      return;
    }
    
    // Validate year range
    if (creationYear && (isNaN(creationYear) || creationYear < 2020 || creationYear > 2025)) {
      console.log('אנא הזן שנה תקינה בין 2020-2025');
      return;
    }
    
    // Validate member counts
    if (minMembers && (isNaN(minMembers) || minMembers < 1)) {
      console.log('מינימום משתתפים חייב להיות מספר חיובי');
      return;
    }
    
    if (maxMembers && (isNaN(maxMembers) || maxMembers < 1)) {
      console.log('מקסימום משתתפים חייב להיות מספר חיובי');
      return;
    }
    
    if (minMembers && maxMembers && parseInt(minMembers) > parseInt(maxMembers)) {
      console.log('מינימום משתתפים לא יכול להיות גבוה יותר מהמקסימום');
      return;
    }
    
    const token = getToken();
    if (!token) {
      console.log('אנא התחבר תחילה');
      return;
    }
    
    // Show loading state
    const searchBtn = document.querySelector('#advancedGroupSearchModal .btn-search-advanced');
    const originalText = searchBtn.innerHTML;
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>מחפש...';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (adminName) params.append('adminName', adminName);
    if (creationYear) params.append('creationYear', creationYear);
    if (minMembers) params.append('minMembers', minMembers);
    if (maxMembers) params.append('maxMembers', maxMembers);
    
    // Perform the search
    const response = await fetch(`/api/groups/search/advanced?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'שגיאה בחיפוש קבוצות');
    }
    
    const data = await response.json();
    console.log('Advanced search results:', data);
    console.log('Groups found:', data.data);
    
    // Close the advanced search modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('advancedGroupSearchModal'));
    modal.hide();
    
    // Reopen the main search modal and switch to groups tab
    setTimeout(() => {
      const searchModal = new bootstrap.Modal(document.getElementById('searchModal'));
      searchModal.show();
      
      // Switch to groups tab
      const groupsTab = document.getElementById('groups-tab');
      const groupsTabPane = document.getElementById('groups-tab-pane');
      const peopleTab = document.getElementById('people-tab');
      const peopleTabPane = document.getElementById('people-tab-pane');
      
      // Remove active from people tab
      peopleTab.classList.remove('active');
      peopleTabPane.classList.remove('show', 'active');
      
      // Add active to groups tab
      groupsTab.classList.add('active');
      groupsTabPane.classList.add('show', 'active');
      
      // Display results in the groups search tab
      displayAdvancedGroupResults(data.data, data.searchCriteria);
      
      // Log success message
      console.log(`נמצאו ${data.data.length} קבוצות`);
    }, 300);
    
    // Reset button state
    searchBtn.disabled = false;
    searchBtn.innerHTML = originalText;
    
  } catch (error) {
    console.error('Error performing advanced group search:', error);
    console.log(error.message || 'שגיאה בחיפוש מתקדם');
    
    // Reset button state
    const searchBtn = document.querySelector('#advancedGroupSearchModal .btn-search-advanced');
    searchBtn.disabled = false;
    searchBtn.innerHTML = '<i class="bi bi-search me-1"></i>חיפוש';
  }
}

// Function to display advanced group search results
function displayAdvancedGroupResults(groups, searchCriteria) {
  console.log('displayAdvancedGroupResults called with:', groups, searchCriteria);
  const resultsContainer = document.getElementById('groupsSearchResults');
  console.log('Results container:', resultsContainer);
  
  if (!groups || groups.length === 0) {
    resultsContainer.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-collection text-muted" style="font-size: 3rem;"></i>
        <p class="text-muted mt-3">לא נמצאו קבוצות העונות לקריטריונים</p>
        <small class="text-muted">נסה לשנות את הפרמטרים ולחפש שוב</small>
      </div>
    `;
    return;
  }
  
  let criteriaText = 'תוצאות חיפוש מתקדם: ';
  const criteria = [];
  if (searchCriteria.adminName) criteria.push(`מנהל: ${searchCriteria.adminName}`);
  if (searchCriteria.creationYear) criteria.push(`שנה: ${searchCriteria.creationYear}`);
  if (searchCriteria.minMembers || searchCriteria.maxMembers) {
    const memberRange = [];
    if (searchCriteria.minMembers) memberRange.push(`מינימום ${searchCriteria.minMembers}`);
    if (searchCriteria.maxMembers) memberRange.push(`מקסימום ${searchCriteria.maxMembers}`);
    criteria.push(`משתתפים: ${memberRange.join('-')}`);
  }
  criteriaText += criteria.join(', ');
  
  const currentUserId = window.currentUser?.userId || window.currentUser?.id;
  
  const groupsHTML = groups.map(group => {
    // Check if current user is a member
    const isMember = group.memberDetails && group.memberDetails.some(member => 
      member._id === currentUserId || member === currentUserId
    );
    
    // Check if current user is admin  
    const isAdmin = group.adminInfo && (group.adminInfo._id === currentUserId || group.adminInfo === currentUserId);
    
    console.log(`Group ${group.name}: isMember=${isMember}, isAdmin=${isAdmin}, currentUserId=${currentUserId}`);
    
    let actionButton = '';
    if (isAdmin) {
      actionButton = `<button class="btn btn-member-active" disabled><span class="btn-text">מנהל</span></button>`;
    } else if (isMember) {
      actionButton = `<button class="btn btn-member-active" onclick="toggleGroupMembership('${group._id}', true)"><span class="btn-text">חבר</span></button>`;
    } else {
      actionButton = `<button class="btn btn-join-group" onclick="toggleGroupMembership('${group._id}', false)"><i class="bi bi-plus-circle me-1"></i>הצטרפות לקבוצה</button>`;
    }
    
    return `
      <div class="search-result-item">
        <img src="${group.imageUrl || '/images/profile.jpg'}" alt="${group.name}" class="search-result-avatar">
        <div class="search-result-info">
          <h6 class="search-result-name clickable-group-name" onclick="showGroupInfo('${group._id}')" title="לחץ לצפייה במידע הקבוצה">${group.name}</h6>
          <div class="search-result-details">
            <small class="text-muted">
              <i class="bi bi-person-badge me-1"></i>מנהל: ${group.adminInfo?.username || 'לא זמין'}
            </small><br>
            <small class="text-muted">
              <i class="bi bi-people me-1"></i>${group.memberCount} משתתפים
            </small><br>
            <small class="text-muted">
              <i class="bi bi-calendar me-1"></i>נוצר בשנת ${group.creationYear}
            </small>
          </div>
        </div>
        <div class="search-result-actions">
          ${actionButton}
        </div>
      </div>
    `;
  }).join('');
  
  resultsContainer.innerHTML = `
    <div class="mb-3">
      <small class="text-muted">${criteriaText}</small>
    </div>
    ${groupsHTML}
  `;
  
  console.log('Results displayed. Container content:', resultsContainer.innerHTML);
}

// Function to show group information popup
async function showGroupInfo(groupId) {
  try {
    const token = getToken();
    if (!token) {
      console.log('אנא התחבר תחילה');
      return;
    }
    
    // Fetch group details
    const response = await fetch(`/api/groups/${groupId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch group details');
    }
    
    const data = await response.json();
    const group = data.data || data;
    
    // Use the existing group details modal function
    viewGroupDetails(groupId);
    
  } catch (error) {
    console.error('Error fetching group info:', error);
    console.log('שגיאה בטעינת מידע הקבוצה');
  }
}

// Function to toggle group membership (join/leave)
async function toggleGroupMembership(groupId, isMember) {
  try {
    const token = getToken();
    if (!token) {
      console.log('אנא התחבר תחילה');
      return;
    }
    
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.disabled = true;
    
    if (isMember) {
      // User is leaving the group
      button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>עוזב...';
      
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave group');
      }
      
      // Update button to join state
      button.className = 'btn btn-join-group';
      button.innerHTML = '<i class="bi bi-plus-circle me-1"></i>הצטרפות לקבוצה';
      button.onclick = () => toggleGroupMembership(groupId, false);
      button.disabled = false;
      
      console.log('עזבת את הקבוצה בהצלחה!');
      
    } else {
      // User is joining the group
      button.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>מצטרף...';
      
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join group');
      }
      
      // Update button to member state
      button.className = 'btn btn-member-active';
      button.innerHTML = '<span class="btn-text">חבר</span>';
      button.onclick = () => toggleGroupMembership(groupId, true);
      button.disabled = false;
      
      console.log('הצטרפת לקבוצה בהצלחה!');
    }
    
  } catch (error) {
    console.error('Error toggling group membership:', error);
    console.log(error.message || 'שגיאה בעדכון חברות בקבוצה');
    
    // Reset button state
    const button = event.target.closest('button');
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

// Function to apply advanced filters
function applyAdvancedFilters(username, postType, minLikes) {
  const posts = document.querySelectorAll('.post-container');
  
  posts.forEach(post => {
    let show = true;
    
    // Filter by username
    if (username) {
      const postUsername = post.querySelector('.username-link');
      if (postUsername) {
        const postUsernameText = postUsername.textContent || postUsername.innerText;
        if (!postUsernameText.toLowerCase().includes(username.toLowerCase())) {
          show = false;
        }
      } else {
        show = false;
      }
    }
    
    // Filter by post type
    if (show && postType !== 'all') {
      const hasVideo = post.querySelector('video');
      const hasImg = post.querySelector('.post-media img');
      const captionElement = post.querySelector('.post-caption');
      const postTextElement = captionElement ? captionElement.querySelector('.post-text') : null;
      const captionText = postTextElement ? (postTextElement.textContent || postTextElement.innerText) : '';
      const hasText = captionText.trim().length > 0;
      
      if (postType === 'text') {
        show = hasText && !hasImg && !hasVideo;
      } else if (postType === 'video') {
        show = !!hasVideo;
      } else if (postType === 'image') {
        show = !!hasImg && !hasVideo;
      }
    }
    
    // Filter by minimum likes
    if (show && minLikes) {
      const likeCountElement = post.querySelector('.like-count');
      if (likeCountElement) {
        const likeCount = parseInt(likeCountElement.textContent) || 0;
        if (likeCount < parseInt(minLikes)) {
          show = false;
        }
      } else {
        show = false;
      }
    }
    
    // Show/hide post
    post.style.display = show ? 'block' : 'none';
  });
  
  // Update filter state
  currentFilterType = postType;
  lastSearchTerm = username;
  
  // Show results count
  const visiblePosts = document.querySelectorAll('.post-container[style="display: block;"]').length;
  const totalPosts = document.querySelectorAll('.post-container').length;
  
  if (username || postType !== 'all' || minLikes) {
    showToast(`נמצאו ${visiblePosts} מתוך ${totalPosts} פוסטים`, 'success');
  }
}


// Confirm user deletion
function confirmDeleteUser() {
  // Show custom confirmation dialog with Hebrew text
  if (confirm('האם אתה בטוח רוצה למחוק את המשתמש?')) {
    deleteUserAccount();
  }
}

// Delete user account
async function deleteUserAccount() {
  try {
    const token = getToken();
    if (!token) {
      showToast('אנא התחבר תחילה', 'error');
      return;
    }

    // Show loading state
    const deleteBtn = document.querySelector('.btn-delete-user');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>מוחק...';
    }

    const response = await fetch('/api/users/me', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'שגיאה במחיקת המשתמש');
    }

    const result = await response.json();
    
    // Clear all local storage
    localStorage.clear();
    
    // Clear current user
    window.currentUser = null;
    
    // Show success message
    showToast('המשתמש נמחק בהצלחה', 'success');
    
    // Redirect to index.html after a short delay
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    
  } catch (error) {
    console.error('Error deleting user account:', error);
    showToast(error.message || 'שגיאה במחיקת המשתמש', 'error');
    
    // Reset button state
    const deleteBtn = document.querySelector('.btn-delete-user');
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = '<i class="bi bi-trash-fill me-1"></i>מחק משתמש';
    }
  }
}

// Update all username displays throughout the app
function updateAllUsernameDisplays(newUsername) {
  const oldUsername = window.currentUser?.username || localStorage.getItem('username');
  
  console.log('Updating usernames from:', oldUsername, 'to:', newUsername);
  
  // Update settings modal username
  document.getElementById('settingsUsername').textContent = newUsername;
  
  // Update sidebar username (keep as "פרופיל")
  const sidebarUsername = document.getElementById('sidebarUsername');
  if (sidebarUsername) {
    sidebarUsername.textContent = 'פרופיל';
  }
  
  // Update suggestions username
  const suggestionsUsername = document.getElementById('suggestionsUsername');
  if (suggestionsUsername) {
    suggestionsUsername.textContent = newUsername;
  }
  
  // Update current user object
  if (window.currentUser) {
    window.currentUser.username = newUsername;
  }
  
  // Update localStorage
  localStorage.setItem('username', newUsername);
  
  // Also update the header to ensure suggestions bar is updated
  renderHeader(window.currentUser);
  
  // Update all post author usernames
  updatePostUsernames(newUsername);
  
  // Update all story usernames
  updateStoryUsernames(newUsername);
  
  // Update all suggestion usernames
  updateSuggestionUsernames(newUsername);
  
  console.log('Updated all username displays to:', newUsername);
}

// Update post usernames
function updatePostUsernames(newUsername) {
  const postContainers = document.querySelectorAll('.post-container');
  let updatedCount = 0;
  const oldUsername = window.currentUser?.username || localStorage.getItem('username');
  
  postContainers.forEach(post => {
    const authorElement = post.querySelector('.username-link');
    if (authorElement) {
      // Check if this is the current user's post by comparing with old username
      const isMyPost = authorElement.textContent === oldUsername;
      
      if (isMyPost) {
        authorElement.textContent = newUsername;
        updatedCount++;
        console.log('Updated post author username from', oldUsername, 'to:', newUsername);
      }
    }
  });
  
  console.log(`Updated ${updatedCount} post usernames to:`, newUsername);
}

// Update story usernames
function updateStoryUsernames(newUsername) {
  const storyElements = document.querySelectorAll('.story-section');
  let updatedCount = 0;
  const oldUsername = window.currentUser?.username || localStorage.getItem('username');
  
  storyElements.forEach(story => {
    const usernameElement = story.querySelector('.story-label');
    if (usernameElement) {
      // Check if this is the current user's story by comparing with old username or checking if it's the "my-ring" story
      const isMyStory = story.classList.contains('my-ring') || 
                       usernameElement.textContent === oldUsername;
      
      if (isMyStory) {
        usernameElement.textContent = newUsername;
        updatedCount++;
        console.log('Updated story username from', oldUsername, 'to:', newUsername);
      }
    }
  });
  
  console.log(`Updated ${updatedCount} story usernames to:`, newUsername);
}

// Update suggestion usernames
function updateSuggestionUsernames(newUsername) {
  const suggestionElements = document.querySelectorAll('#suggestionsContainer .d-flex');
  let updatedCount = 0;
  const oldUsername = window.currentUser?.username || localStorage.getItem('username');
  
  suggestionElements.forEach(suggestion => {
    const usernameElement = suggestion.querySelector('strong');
    if (usernameElement) {
      // Check if this is the current user's suggestion by comparing with old username
      const isMySuggestion = usernameElement.textContent === oldUsername;
      
      if (isMySuggestion) {
        usernameElement.textContent = newUsername;
        updatedCount++;
        console.log('Updated suggestion username from', oldUsername, 'to:', newUsername);
      }
    }
  });
  
  console.log(`Updated ${updatedCount} suggestion usernames to:`, newUsername);
}

// Legacy saveSettings function (kept for compatibility)
async function saveSettings() {
  confirmSaveSettings();
}

// Show settings error message
function showSettingsError(message) {
  const errorElement = document.getElementById('settingsError');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

// Show settings success message
function showSettingsSuccess(message) {
  showToast(message, 'success');
}


// Search Modal Functions
function openSearchModal() {
  const searchModal = new bootstrap.Modal(document.getElementById('searchModal'));
  searchModal.show();
  
  // Show loading messages
  const peopleContainer = document.getElementById('peopleSearchResults');
  const groupsContainer = document.getElementById('groupsSearchResults');
  
  if (peopleContainer) {
    peopleContainer.innerHTML = '<div class="text-center text-muted">טוען משתמשים...</div>';
  }
  
  if (groupsContainer) {
    groupsContainer.innerHTML = '<div class="text-center text-muted">טוען קבוצות...</div>';
  }
  
  // Load initial data
  loadAllUsers();
  loadAllGroups();
}

// Load all users for search
async function loadAllUsers() {
  try {
    console.log('=== LOADING ALL USERS FOR SEARCH ===');
    
    // First, ensure we have current user data
    if (!window.currentUser) {
      console.log('No current user, fetching user data first...');
      await fetchCurrentUser();
    }
    
    const token = getToken();
    console.log('Token found:', token ? 'YES' : 'NO');
    console.log('Current user:', window.currentUser);
    
    if (!token) {
      console.error('No token found, cannot load users');
      const container = document.getElementById('peopleSearchResults');
      if (container) {
        container.innerHTML = `<div class="text-center text-danger">שגיאה: לא מאומת, יש להתחבר מחדש</div>`;
      }
      return;
    }
    
    const response = await fetch('/api/users/search', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Users search response status:', response.status);
    
    if (response.ok) {
      const usersData = await response.json();
      console.log('Loaded users for search:', usersData);
      
      // Store users globally for search
      window.allUsers = usersData.data || usersData;
      
      console.log(`Total users loaded: ${window.allUsers.length}`);
      console.log('Sample user:', window.allUsers[0]);
      
      // Display all users initially
      displayUsersSearchResults(window.allUsers);
    } else {
      console.error('Failed to load users:', response.status);
      const errorData = await response.json();
      console.error('Error details:', errorData);
      
      // Show error message to user
      const container = document.getElementById('peopleSearchResults');
      if (container) {
        container.innerHTML = `<div class="text-center text-danger">שגיאה בטעינת משתמשים: ${errorData.error || 'שגיאה לא ידועה'}</div>`;
      }
    }
  } catch (error) {
    console.error('Error loading users:', error);
    
    // Show error message to user
    const container = document.getElementById('peopleSearchResults');
    if (container) {
      container.innerHTML = `<div class="text-center text-danger">שגיאה בטעינת משתמשים: ${error.message}</div>`;
    }
  }
}

// Load all groups for search
async function loadAllGroups() {
  try {
    const token = getToken();
    const response = await fetch('/api/groups', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const groupsData = await response.json();
      console.log('Loaded groups for search:', groupsData);
      
      // Store groups globally for search
      window.allGroups = groupsData.data || groupsData;
      
      // Display all groups initially
      displayGroupsSearchResults(window.allGroups);
    } else {
      console.error('Failed to load groups:', response.status);
    }
  } catch (error) {
    console.error('Error loading groups:', error);
  }
}

// Search people function
function searchPeople(query) {
  if (!window.allUsers) return;
  
  const filteredUsers = window.allUsers.filter(user => 
    user.username.toLowerCase().includes(query.toLowerCase()) ||
    (user.profile && user.profile.firstName && user.profile.firstName.toLowerCase().includes(query.toLowerCase())) ||
    (user.profile && user.profile.lastName && user.profile.lastName.toLowerCase().includes(query.toLowerCase()))
  );
  
  displayUsersSearchResults(filteredUsers);
}

// Search groups function
function searchGroups(query) {
  if (!window.allGroups) return;
  
  const filteredGroups = window.allGroups.filter(group => 
    group.name.toLowerCase().includes(query.toLowerCase()) ||
    group.description.toLowerCase().includes(query.toLowerCase()) ||
    group.category.toLowerCase().includes(query.toLowerCase())
  );
  
  displayGroupsSearchResults(filteredGroups);
}

// Display users search results
function displayUsersSearchResults(users) {
  const container = document.getElementById('peopleSearchResults');
  if (!container) return;
  
  console.log('=== DISPLAYING USERS SEARCH RESULTS ===');
  console.log('Users to display:', users);
  console.log('Users length:', users?.length);
  
  if (!users || users.length === 0) {
    container.innerHTML = '<div class="text-center text-muted">לא נמצאו משתמשים</div>';
    return;
  }
  
  const currentUserId = window.currentUser?.userId;
  
  console.log('Current user ID:', currentUserId);
  console.log('Current user following from window.currentUser:', window.currentUser?.following);
  
  const usersHTML = users.map(user => {
    console.log('Processing user:', user);
    
    if (user._id === currentUserId) {
      console.log('Skipping current user:', user.username);
      return ''; // Don't show current user
    }
    
    // Check if current user is following this user by checking the current user's following array
    const currentUserFollowing = window.currentUser?.following || [];
    const isFollowing = currentUserFollowing.some(followingId => 
      String(followingId) === String(user._id)
    );
    
    console.log(`User ${user.username} - isFollowing:`, isFollowing);
    console.log(`Current user following list:`, currentUserFollowing);
    console.log(`Checking if ${user._id} is in following list`);
    
    let followButton;
    if (isFollowing) {
      // User is already following - show "בטל מעקב" button
      followButton = `<button class="btn btn-unfollow" onclick="unfollowUser('${user._id}', this)">בטל מעקב</button>`;
    } else {
      // User is not following - show "מעקב" button
      followButton = `<button class="btn btn-follow" onclick="followUser('${user._id}', this)">מעקב</button>`;
    }
    
    return `
      <div class="search-result-item">
        <img src="${user.avatarUrl || 'images/profile.jpg'}" 
             alt="${user.username}" 
             class="search-result-avatar"
             onerror="this.src='images/profile.jpg'">
        <div class="search-result-info">
          <div class="search-result-name">${user.username}</div>
          <div class="search-result-details">
            ${user.profile?.firstName || ''} ${user.profile?.lastName || ''}
          </div>
        </div>
        <div class="search-result-actions">
          ${followButton}
        </div>
      </div>
    `;
  }).join('');
  
  console.log('Generated HTML length:', usersHTML.length);
  container.innerHTML = usersHTML;
}

// Display groups search results
function displayGroupsSearchResults(groups) {
  const container = document.getElementById('groupsSearchResults');
  if (!container) return;
  
  if (!groups || groups.length === 0) {
    container.innerHTML = '<div class="text-center text-muted">לא נמצאו קבוצות</div>';
    return;
  }
  
  const currentUserId = window.currentUser?.userId;
  const currentUserGroups = window.currentUser?.groups || [];
  
  console.log('=== DISPLAYING GROUPS SEARCH RESULTS ===');
  console.log('Current user ID:', currentUserId);
  console.log('Current user groups:', currentUserGroups);
  
  const groupsHTML = groups.map(group => {
    console.log('Processing group:', group.name);
    console.log('Group members:', group.members);
    console.log('Group admin:', group.admin);
    
    // Check if current user is a member by checking the group's members array
    const isMember = group.members && group.members.some(member => 
      member._id === currentUserId || member === currentUserId
    );
    
    // Check if current user is admin
    const isAdmin = group.admin && (group.admin._id === currentUserId || group.admin === currentUserId);
    
    console.log(`Group ${group.name} - isMember:`, isMember, 'isAdmin:', isAdmin);
    
    let actionButton = '';
    if (isAdmin) {
      actionButton = '<button class="btn btn-member" disabled>מנהל</button>';
    } else if (isMember) {
      actionButton = '<button class="btn btn-member" disabled>חבר</button>';
    } else {
      actionButton = `<button class="btn btn-join-group" onclick="joinGroup('${group._id}', this)">הצטרפות לקבוצה</button>`;
    }
    
            return `
          <div class="search-result-item">
            <img src="${group.imageUrl || 'images/profile.jpg'}" 
                 alt="${group.name}" 
                 class="search-result-avatar"
                 onerror="this.src='images/profile.jpg'">
            <div class="search-result-info">
              <div class="search-result-name" style="cursor: pointer; color: #8b5cf6;" onclick="openGroupDetailsModal('${group._id}')">${group.name}</div>
              <div class="search-result-details">
                ${group.description || ''} • ${group.category || ''} • ${group.members?.length || 0} חברים
              </div>
            </div>
            <div class="search-result-actions">
              ${actionButton}
            </div>
          </div>
        `;
  }).join('');
  
  container.innerHTML = groupsHTML;
}

// Unfollow user function
async function unfollowUser(userId, buttonElement) {
  try {
    console.log('=== UNFOLLOWING USER ===');
    console.log('User ID to unfollow:', userId);
    console.log('Button element:', buttonElement);
    
    const token = getToken();
    const response = await fetch(`/api/users/${userId}/unfollow`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Unfollow response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Unfollow successful:', result);
      
      // Update button to show "מעקב" again
      buttonElement.textContent = 'מעקב';
      buttonElement.classList.remove('btn-unfollow');
      buttonElement.classList.add('btn-follow');
      buttonElement.onclick = () => followUser(userId, buttonElement);
      
      // Remove from current user following list
      if (window.currentUser && window.currentUser.following) {
        const index = window.currentUser.following.indexOf(userId);
        if (index > -1) {
          window.currentUser.following.splice(index, 1);
        }
      }
      
      // Update the user in the global users list to reflect the unfollow status
      if (window.allUsers) {
        const userIndex = window.allUsers.findIndex(user => user._id === userId);
        if (userIndex !== -1 && window.allUsers[userIndex].followers) {
          const followerIndex = window.allUsers[userIndex].followers.findIndex(follower => 
            follower._id === (window.currentUser?.userId || window.currentUser?.id) || 
            follower === (window.currentUser?.userId || window.currentUser?.id)
          );
          if (followerIndex > -1) {
            window.allUsers[userIndex].followers.splice(followerIndex, 1);
          }
        }
      }
      
      // Refresh stories to show updated following state
      console.log('Refreshing stories after unfollow...');
      // Small delay to ensure smooth UI update
      setTimeout(() => {
          refreshStories();
      }, 300);
      
      // Refresh suggestions to potentially add the unfollowed user back to suggestions
      console.log('Refreshing suggestions after unfollow...');
      setTimeout(() => {
          refreshSuggestions();
      }, 500);
      
      // Refresh posts to show updated following state
      console.log('Refreshing posts after unfollow...');
      // Small delay to ensure smooth UI update
      setTimeout(() => {
          refreshPosts();
      }, 500);
      
    } else {
      const errorData = await response.json();
      console.error('Unfollow failed:', errorData);
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
  }
}

// Follow user function
async function followUser(userId, buttonElement) {
  try {
    console.log('=== FOLLOWING USER ===');
    console.log('User ID to follow:', userId);
    console.log('Button element:', buttonElement);
    
    const token = getToken();
    const response = await fetch(`/api/users/${userId}/follow`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Follow response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Follow successful:', result);
      
      // Determine context: suggestions sidebar vs search results
      const isInSuggestions = buttonElement.closest('#suggestionsContainer');
      const isInSearchResults = buttonElement.closest('#peopleSearchResults');
      
      if (isInSuggestions) {
        // In suggestions sidebar: remove the item (will be replaced by refreshSuggestions)
        console.log('Follow button clicked in suggestions sidebar - item will be replaced');
      } else if (isInSearchResults) {
        // In search results: update button to show "בטל מעקב"
        console.log('Follow button clicked in search results - updating button text');
        if (buttonElement) {
          buttonElement.textContent = 'בטל מעקב';
          buttonElement.classList.remove('btn-follow');
          buttonElement.classList.add('btn-unfollow');
          buttonElement.onclick = () => unfollowUser(userId, buttonElement);
        }
      }
      
      // Update current user following list
      if (window.currentUser && !window.currentUser.following) {
        window.currentUser.following = [];
      }
      if (window.currentUser) {
        window.currentUser.following.push(userId);
      }
      
      // Update the user in the global users list to reflect the follow status
      if (window.allUsers) {
        const userIndex = window.allUsers.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          if (!window.allUsers[userIndex].followers) {
            window.allUsers[userIndex].followers = [];
          }
          window.allUsers[userIndex].followers.push(window.currentUser?.userId || window.currentUser?.id);
        }
      }
      
      // Refresh stories to show updated following state
      console.log('Refreshing stories after follow...');
      // Small delay to ensure smooth UI update
      setTimeout(() => {
          refreshStories();
      }, 300);
      
      // Refresh posts to show updated following state
      console.log('Refreshing posts after follow...');
      // Small delay to ensure smooth UI update
      setTimeout(() => {
          refreshPosts();
      }, 500);
      
      // Refresh suggestions only if the follow was from suggestions sidebar
      if (isInSuggestions) {
        console.log('Refreshing suggestions after follow...');
        setTimeout(() => {
            refreshSuggestions();
        }, 300);
      }
      
    } else {
      const errorData = await response.json();
      console.error('Follow failed:', errorData);
    }
  } catch (error) {
    console.error('Error following user:', error);
  }
}

// Leave group function
async function leaveGroup(groupId, buttonElement) {
  try {
    console.log('=== LEAVING GROUP ===');
    console.log('Group ID to leave:', groupId);
    console.log('Button element:', buttonElement);
    
    const token = getToken();
    const response = await fetch(`/api/groups/${groupId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Leave group response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Leave group successful:', result);
      
      // Update button to show "הצטרפות לקבוצה" again
      buttonElement.textContent = 'הצטרפות לקבוצה';
      buttonElement.classList.remove('btn-member');
      buttonElement.classList.add('btn-join-group');
      buttonElement.onclick = () => joinGroup(groupId, buttonElement);
      
      // Remove from current user groups list
      if (window.currentUser && window.currentUser.groups) {
        const index = window.currentUser.groups.indexOf(groupId);
        if (index > -1) {
          window.currentUser.groups.splice(index, 1);
        }
      }
      
    } else {
      const errorData = await response.json();
      console.error('Leave group failed:', errorData);
    }
  } catch (error) {
    console.error('Error leaving group:', error);
  }
}

// Join group function
async function joinGroup(groupId, buttonElement) {
  try {
    const token = getToken();
    const response = await fetch(`/api/groups/${groupId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      // Update button to show member (clickable to leave group)
      buttonElement.textContent = 'חבר';
      buttonElement.classList.remove('btn-join-group');
      buttonElement.classList.add('btn-member');
      buttonElement.disabled = false; // Make it clickable
      buttonElement.onclick = () => leaveGroup(groupId, buttonElement);
      
      // Update current user groups list
      if (window.currentUser && !window.currentUser.groups) {
        window.currentUser.groups = [];
      }
      if (window.currentUser) {
        window.currentUser.groups.push(groupId);
      }
    
    } else {
    }
  } catch (error) {
    console.error('Error joining group:', error);
  }
}

// Open group details modal
async function openGroupDetailsModal(groupId) {
  try {
    console.log('=== OPENING GROUP DETAILS MODAL ===');
    console.log('Group ID:', groupId);
    
    // First, close the search modal
    const searchModal = bootstrap.Modal.getInstance(document.getElementById('searchModal'));
    if (searchModal) {
      searchModal.hide();
      console.log('Search modal closed');
    }
    
    // Wait a bit for the search modal to close
    setTimeout(async () => {
      // Fetch group details from server
      const token = getToken();
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const groupData = await response.json();
        console.log('Group data:', groupData);
        
        // Populate modal with group details
        populateGroupDetailsModal(groupData);
        
        // Show the modal
        const groupDetailsModal = new bootstrap.Modal(document.getElementById('groupDetailsModal'));
        groupDetailsModal.show();
        console.log('Group details modal opened');
        
      } else {
        console.error('Failed to fetch group details:', response.status);
      }
    }, 300); // Wait 300ms for modal to close
    
  } catch (error) {
    console.error('Error opening group details modal:', error);
  }
}

// Populate group details modal
function populateGroupDetailsModal(group) {
  // Set group avatar
  const groupAvatar = document.getElementById('groupDetailsAvatar');
  if (groupAvatar) {
    groupAvatar.src = group.avatarUrl || 'images/profile.jpg';
    groupAvatar.alt = group.name;
  }
  
  // Set group name
  const groupName = document.getElementById('groupDetailsName');
  if (groupName) {
    groupName.textContent = group.name;
  }
  
  // Set group description
  const groupDescription = document.getElementById('groupDetailsDescription');
  if (groupDescription) {
    groupDescription.textContent = group.description || 'אין תיאור';
  }
  
  // Set group category
  const groupCategory = document.getElementById('groupDetailsCategory');
  if (groupCategory) {
    groupCategory.textContent = group.category || 'ללא קטגוריה';
  }
  
  // Set member count
  const memberCount = document.getElementById('groupDetailsMemberCount');
  if (memberCount) {
    memberCount.textContent = group.members?.length || 0;
  }
  
  // Set admin info
  const adminAvatar = document.getElementById('groupDetailsAdminAvatar');
  const adminName = document.getElementById('groupDetailsAdminName');
  if (adminAvatar && adminName) {
    if (group.admin) {
      adminAvatar.src = group.admin.avatarUrl || 'images/profile.jpg';
      adminName.textContent = group.admin.username || 'לא ידוע';
    } else {
      adminAvatar.src = 'images/profile.jpg';
      adminName.textContent = 'לא ידוע';
    }
  }
  
  // Populate members grid
  const membersContainer = document.getElementById('groupDetailsMembers');
  if (membersContainer && group.members) {
    const membersHTML = group.members.map(member => {
      const memberData = member._id ? member : { _id: member, username: 'חבר', avatarUrl: 'images/profile.jpg' };
      return `
        <div class="member-item">
          <img src="${memberData.avatarUrl || 'images/profile.jpg'}" 
               alt="${memberData.username}" 
               class="member-avatar"
               onerror="this.src='images/profile.jpg'">
          <p class="member-name">${memberData.username}</p>
        </div>
      `;
    }).join('');
    
    membersContainer.innerHTML = membersHTML;
  }
}

// View group details function (legacy - keeping for compatibility)
function viewGroupDetails(groupId) {
  // This function now just calls the main function
  openGroupDetailsModal(groupId);
}

// Close group details modal and return to search
function closeGroupDetailsAndReturnToSearch() {
  // Close the group details modal
  const groupDetailsModal = bootstrap.Modal.getInstance(document.getElementById('groupDetailsModal'));
  if (groupDetailsModal) {
    groupDetailsModal.hide();
  }
  
  // Wait a bit and then reopen the search modal
  setTimeout(() => {
    const searchModal = new bootstrap.Modal(document.getElementById('searchModal'));
    searchModal.show();
    
    // Reload the data
    loadAllUsers();
    loadAllGroups();
  }, 300);
}

// Function to highlight text while preserving HTML structure
function highlightTextInHTML(html, searchTerm) {
  if (!searchTerm) return html;
  
  // Create a temporary div to work with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Function to recursively highlight text in text nodes
  function highlightTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const searchLower = searchTerm.toLowerCase();
      const textLower = text.toLowerCase();
      
      if (textLower.includes(searchLower)) {
        // Find the actual case-sensitive matches
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        const highlightedText = text.replace(regex, '<span class="highlight">$1</span>');
        
        // Create a new element with the highlighted text
        const span = document.createElement('span');
        span.innerHTML = highlightedText;
        
        // Replace the text node with the highlighted content
        node.parentNode.replaceChild(span, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recursively process child nodes
      const childNodes = Array.from(node.childNodes);
      childNodes.forEach(child => highlightTextNodes(child));
    }
  }
  
  // Process all text nodes in the HTML
  highlightTextNodes(tempDiv);
  
  return tempDiv.innerHTML;
}

// Function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Smooth scroll to search bar
function scrollToSearchBar(event) {
  event.preventDefault();
  const searchBar = document.getElementById('mainSearchBar');
  if (searchBar) {
    searchBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Optionally focus the input
    const input = searchBar.querySelector('input');
    if (input) input.focus();
  }
}

// Follow button toggle function for suggestions - SIMPLIFIED VERSION
async function toggleFollow(button, event) {
    try {
        // Prevent default behavior
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        
        // Prevent rapid clicks and ignore if button is disabled
        if (button.disabled || button.classList.contains('processing')) {
            return;
        }
        
        // Safety check - ensure button exists and is valid
        if (!button || !button.parentNode) {
            console.error(' CRITICAL: Invalid button passed to toggleFollow');
            return;
        }
        
        console.log('toggleFollow called for:', button.getAttribute('data-username'));
        
        // Get the target username from the data attribute
        const targetUsername = button.getAttribute('data-username');
        if (!targetUsername) {
            console.error('No username found in data-username attribute');
            return;
        }
        
        // Additional safety - ensure button is visible before starting
        button.style.display = 'block';
        button.style.visibility = 'visible';
        button.style.opacity = '1';
        
        // Get auth token
        const token = getToken();
        if (!token) {
            console.error('No JWT token found');
            showFollowError('אנא התחבר כדי לעקוב אחרי משתמשים');
            return;
        }
        
        // Prevent following self
        const currentUsername = localStorage.getItem('username');
        if (targetUsername === currentUsername) {
            showFollowError('לא ניתן לעקוב אחרי עצמך');
            return;
        }
        
        // Determine current state and action
        const isCurrentlyFollowing = button.textContent === "עוקב";
        const action = isCurrentlyFollowing ? 'unfollow' : 'follow';
        
        console.log(`Action: ${action} for ${targetUsername} (currently following: ${isCurrentlyFollowing})`);
        
        // Store button reference for safety
        const buttonParent = button.parentNode;
        const buttonIndex = Array.from(buttonParent.children).indexOf(button);
        
        // Set processing state
        button.classList.add('processing');
        button.disabled = true;
        
        // Store original state for rollback
        const originalText = button.textContent;
        const originalClasses = button.className;
        const originalColor = button.style.color;
        
        try {
            // Get or create user ID for this username
            let targetUserId = button.getAttribute('data-user-id');
            
            if (!targetUserId || targetUserId.startsWith('temp_')) {
                console.log(`Resolving username "${targetUsername}" to user ID...`);
                const userResponse = await fetch(`/api/users/by-username/${targetUsername}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
                
                if (!userResponse.ok) {
                    throw new Error(`Failed to get user: ${userResponse.status}`);
                }
                
                const userData = await userResponse.json();
                if (!userData.data || !userData.data._id) {
                    throw new Error('Invalid user data received from server');
                }
                
                targetUserId = String(userData.data._id);
                button.setAttribute('data-user-id', targetUserId);
                console.log(`Username "${targetUsername}" resolved to user ID: ${targetUserId}`);
            }
            
            // Send follow/unfollow request
            const response = await fetch(`/api/users/${targetUserId}/${action}`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                let errorMessage = `${action} failed: ${response.status}`;
                
                try {
                    const errorJson = JSON.parse(errorData);
                    if (errorJson.code === 'ALREADY_FOLLOWING') {
                        errorMessage = 'אתה כבר עוקב אחרי משתמש זה';
                    } else if (errorJson.code === 'NOT_FOLLOWING') {
                        errorMessage = 'אתה לא עוקב אחרי משתמש זה';
                    } else if (errorJson.error) {
                        errorMessage = errorJson.error;
                    }
                } catch (e) {
                    errorMessage = `${action} failed: ${response.status} - ${errorData}`;
                }
                
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            console.log(`${action} successful for ${targetUsername}:`, result);
            
            // Update button state on success
            if (action === 'follow') {
                button.textContent = "עוקב";
                button.classList.add("following");
                button.style.color = "#8e8e8e";
                button.setAttribute('aria-pressed', 'true');
                localStorage.setItem(`following_${targetUsername}`, 'true');
            } else {
                button.textContent = "מעקב";
                button.classList.remove("following");
                button.style.color = "#0095f6";
                button.setAttribute('aria-pressed', 'false');
                localStorage.removeItem(`following_${targetUsername}`);
            }
            
            // Refresh suggestions when following/unfollowing to show updated list
            if (action === 'follow') {
                console.log('User followed, refreshing suggestions...');
                await loadSuggestions();
            }
            
            // Refresh stories to show updated following state
            console.log('Refreshing stories after follow/unfollow...');
            // Small delay to ensure smooth UI update
            setTimeout(() => {
                refreshStories();
            }, 300);
            
            // Refresh posts to show updated following state
            console.log('Refreshing posts after follow/unfollow...');
            // Small delay to ensure smooth UI update
            setTimeout(() => {
                refreshPosts();
            }, 500);
            
            // Ensure button remains visible after state change
            button.style.display = 'block';
            button.style.visibility = 'visible';
            button.style.opacity = '1';
            
            // Additional safety: force button to stay in DOM
            if (button.parentNode) {
                button.parentNode.appendChild(button);
            }
            
        } catch (error) {
            console.error(`Error ${action}ing user ${targetUsername}:`, error);
            showFollowError(`${action === 'follow' ? 'עקיבה' : 'ביטול עקיבה'} נכשלה: ${error.message}`);
            
            // Rollback UI changes on error
            button.textContent = originalText;
            button.className = originalClasses;
            button.style.color = originalColor;
            button.setAttribute('aria-pressed', isCurrentlyFollowing ? 'true' : 'false');
            
            // Ensure button remains visible after rollback
            button.style.display = 'block';
            button.style.visibility = 'visible';
            button.style.opacity = '1';
        }
        
    } catch (error) {
        console.error('Unexpected error in toggleFollow:', error);
        showToast('שגיאה לא צפויה בעת עקיבה אחרי משתמש', 'error');
    } finally {
        // Re-enable button
        button.classList.remove('processing');
        button.disabled = false;
        
        // Final safety check - ensure button is always visible
        if (button && button.parentNode) {
            button.style.display = 'block';
            button.style.visibility = 'visible';
            button.style.opacity = '1';
        }
        
        // Emergency button restoration if it disappeared
        if (!button || !button.parentNode) {
            console.error('CRITICAL: Button disappeared! Attempting restoration...');
            if (buttonParent && buttonIndex >= 0) {
                // Try to find the button by username
                const existingButton = buttonParent.querySelector(`[data-username="${targetUsername}"]`);
                if (!existingButton) {
                    // Recreate the button
                    const newButton = document.createElement('button');
                    newButton.className = 'follow-btn';
                    newButton.setAttribute('data-username', targetUsername);
                    newButton.setAttribute('data-user-id', button.getAttribute('data-user-id'));
                    newButton.setAttribute('aria-pressed', isCurrentlyFollowing ? 'true' : 'false');
                    
                    if (isCurrentlyFollowing) {
                        newButton.textContent = "עוקב";
                        newButton.classList.add("following");
                        newButton.style.color = "#8e8e8e";
                    } else {
                        newButton.textContent = "מעקב";
                        newButton.classList.remove("following");
                        newButton.style.color = "#0095f6";
                    }
                    
                    buttonParent.appendChild(newButton);
                    console.log('Button restored after disappearance');
                }
            }
        }
        
        // Final verification - ensure button is visible and functional
        const finalButton = document.querySelector(`[data-username="${targetUsername}"]`);
        if (finalButton) {
            finalButton.style.display = 'block';
            finalButton.style.visibility = 'visible';
            finalButton.style.opacity = '1';
            console.log('Final button visibility check passed');
        } else {
            console.error('CRITICAL: Button not found in final check!');
        }
    }
}

// Initialize suggestions on page load - SIMPLIFIED VERSION
async function initializeSuggestions() {
    try {
        console.log('Initializing suggestions...');
        
        const suggestionsContainer = document.getElementById('suggestionsContainer');
        if (!suggestionsContainer) {
            console.error('Suggestions container not found');
            return;
        }
        
        // Find all follow buttons within the suggestions container
        const followButtons = suggestionsContainer.querySelectorAll('.follow-btn');
        console.log(`Found ${followButtons.length} follow buttons in suggestions container`);
        
        if (followButtons.length === 0) {
            console.log('No follow buttons found to initialize');
            return;
        }
        
        // Get current user's following list from server
        const token = getToken();
        if (!token) {
            console.log('No token found, skipping server state hydration');
            return;
        }
        
        try {
            const response = await fetch('/api/users/me/following', {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (response.ok) {
                const followingData = await response.json();
                const followingUserIds = followingData.data || [];
                console.log(`Current user is following ${followingUserIds.length} users`);
                
                // Hydrate each button with server state
                for (const button of followButtons) {
                    const username = button.getAttribute('data-username');
                    if (!username || username === 'null' || username === 'undefined') {
                        console.warn(`Skipping button with invalid username: "${username}"`);
                        continue;
                    }
                    
                    try {
                        // Resolve username to user ID to check if following
                        const userResponse = await fetch(`/api/users/by-username/${username}`, {
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json"
                            }
                        });
                        
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            const targetUserId = String(userData.data._id);
                            
                            // Store the user ID on the button for future use
                            button.setAttribute('data-user-id', targetUserId);
                            
                            // Check if this user is in the following list
                            const isFollowing = followingUserIds.some(user => 
                                (user._id && user._id.toString() === targetUserId.toString()) ||
                                (user.toString && user.toString() === targetUserId.toString())
                            );
                            
                            console.log(`User ${username} following status:`, isFollowing);
                            
                            // Update button state based on server data
                            if (isFollowing) {
                                button.textContent = "עוקב";
                                button.classList.add("following");
                                button.style.color = "#8e8e8e";
                                button.setAttribute('aria-pressed', 'true');
                                localStorage.setItem(`following_${username}`, 'true');
                            } else {
                                button.textContent = "מעקב";
                                button.classList.remove("following");
                                button.style.color = "#0095f6";
                                button.setAttribute('aria-pressed', 'false');
                                localStorage.removeItem(`following_${username}`);
                            }
                        } else {
                            console.error(`Failed to resolve username ${username}:`, userResponse.status);
                        }
                    } catch (error) {
                        console.error(`Error resolving username ${username}:`, error);
                    }
                }
            } else {
                console.error('Failed to fetch following status from server:', response.status);
            }
        } catch (error) {
            console.error('Error fetching following status from server:', error);
        }
        
        console.log('Suggestions initialization complete');
        
    } catch (error) {
        console.error('Error initializing suggestions:', error);
    }
}

// Call initializeSuggestions when page loads
document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize suggestions after a short delay to ensure DOM is ready
    setTimeout(initializeSuggestions, 1000);
    

});

// CREATE GROUP MODAL LOGIC

let createGroupModal, myGroupsModal, groupError;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing modals...');
  
  // Create group modal elements
  const createGroupModalElement = document.getElementById('createGroupModal');
  const myGroupsModalElement = document.getElementById('myGroupsModal');
  
  if (createGroupModalElement) {
    createGroupModal = new bootstrap.Modal(createGroupModalElement);
    console.log('Create group modal initialized');
  } else {
    console.error('Create group modal element not found!');
  }
  
  if (myGroupsModalElement) {
    myGroupsModal = new bootstrap.Modal(myGroupsModalElement);
    console.log('My groups modal initialized');
  } else {
    console.error('My groups modal element not found!');
  }
  
  groupError = document.getElementById('groupError');
  console.log('Group error element:', groupError);
});

// Function to open create group modal
function openCreateGroupModal() {
  try {
    // Ensure modal HTML exists; if not, inject it
    if (!document.getElementById('createGroupModal')) {
      injectGroupModalsIfMissing();
    }
    // Check if modal exists, if not try to reinitialize
    if (!window.createGroupModal || !createGroupModal._element) {
      console.log('CreateGroup modal not found, attempting to reinitialize...');
      reinitializeModals();
      
      // Check again after reinitializing
      if (!window.createGroupModal || !createGroupModal._element) {
        console.error('CreateGroup modal still not available after reinitializing');
        showToast('שגיאה בפתיחת חלון יצירת הקבוצה', 'error');
        return;
      }
    }
    
    // Clear previous form data
    const groupNameEl = document.getElementById('groupName');
    const groupCategoryEl = document.getElementById('groupCategory');
    const groupDescriptionEl = document.getElementById('groupDescription');
    const groupImageEl = document.getElementById('groupImage');
    const groupErrorEl = document.getElementById('groupError');
    
    if (groupNameEl) groupNameEl.value = '';
    if (groupCategoryEl) groupCategoryEl.value = '';
    if (groupDescriptionEl) groupDescriptionEl.value = '';
    if (groupImageEl) groupImageEl.value = '';
    if (groupErrorEl) {
      groupErrorEl.style.display = 'none';
      groupErrorEl.textContent = '';
    }
    
    // Reset avatar preview
    resetAvatarPreview();
    
    // Show the modal
    createGroupModal.show();
    
    // Initialize avatar gallery after modal is shown
    setTimeout(() => {
      initializeAvatarGallery();
    }, 100);
  } catch (error) {
    console.error('Error opening create group modal:', error);
    showToast('שגיאה בפתיחת חלון יצירת הקבוצה', 'error');
  }
}

// Function to reinitialize modals if they're missing
function reinitializeModals() {
  console.log('Reinitializing modals...');
  
  const createGroupModalElement = document.getElementById('createGroupModal');
  const myGroupsModalElement = document.getElementById('myGroupsModal');
  
  console.log('Modal elements found:', {
    createGroup: !!createGroupModalElement,
    myGroups: !!myGroupsModalElement
  });
  
  if (createGroupModalElement) {
    try {
      // Dispose existing modal if it exists
      if (window.createGroupModal && typeof createGroupModal.dispose === 'function') {
        createGroupModal.dispose();
      }
      window.createGroupModal = new bootstrap.Modal(createGroupModalElement);
      console.log('Create group modal reinitialized successfully');
    } catch (error) {
      console.error('Error reinitializing create group modal:', error);
    }
  }
  
  if (myGroupsModalElement) {
    try {
      // Dispose existing modal if it exists
      if (window.myGroupsModal && typeof myGroupsModal.dispose === 'function') {
        myGroupsModal.dispose();
      }
      window.myGroupsModal = new bootstrap.Modal(myGroupsModalElement);
      console.log('My groups modal reinitialized successfully');
    } catch (error) {
      console.error('Error reinitializing my groups modal:', error);
    }
  }
}

// Inject group-related modal HTML if it was removed from the DOM
function injectGroupModalsIfMissing() {
  let injected = false;
  if (!document.getElementById('createGroupModal')) {
    const createHtml = `
    <div class="modal fade" id="createGroupModal" tabindex="-1" aria-labelledby="createGroupModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content modern-group-modal">
          <div class="modal-header modern-modal-header">
            <h5 class="modal-title" id="createGroupModalLabel">
              <i class="bi bi-plus-circle-fill me-2"></i>יצירת קבוצה חדשה
            </h5>
          </div>
          <div class="modal-body modern-modal-body">
            <form id="createGroupForm" enctype="multipart/form-data">
              <div class="form-group-modern mb-4">
                <label for="groupName" class="form-label-modern">
                  <i class="bi bi-tag-fill me-2"></i>שם הקבוצה
                </label>
                <input type="text" id="groupName" class="form-control-modern" placeholder="הזן שם לקבוצה" required>
              </div>
              <div class="form-group-modern mb-4">
                <label for="groupCategory" class="form-label-modern">
                  <i class="bi bi-collection-fill me-2"></i>קטגוריה
                </label>
                <input type="text" id="groupCategory" class="form-control-modern" placeholder="הזן קטגוריה (אופציונלי)">
              </div>
              <div class="form-group-modern mb-4">
                <label for="groupDescription" class="form-label-modern">
                  <i class="bi bi-chat-text-fill me-2"></i>תיאור הקבוצה
                </label>
                <textarea id="groupDescription" class="form-control-modern" rows="3" placeholder="הוסף תיאור לקבוצה (אופציונלי)" dir="rtl"></textarea>
              </div>
              <div class="form-group-modern mb-4">
                <label for="groupImage" class="form-label-modern">
                  <i class="bi bi-image-fill me-2"></i>תמונת פרופיל לקבוצה
                </label>
                <input type="file" id="groupImage" class="form-control-modern" accept="image/*" onchange="previewGroupImage(this)">
                <div class="form-text-modern">בחר תמונה מהמחשב לתמונת הפרופיל של הקבוצה</div>
              </div>
              <div class="form-group-modern mb-4">
                <label class="form-label-modern">
                  <i class="bi bi-eye-fill me-2"></i>תמונה נבחרת
                </label>
                <div class="avatar-preview-modern">
                  <img id="avatarPreview" src="images/profile.jpg" alt="Avatar Preview" class="avatar-preview-image">
                </div>
              </div>
              <div id="groupError" class="error-message-modern" style="display:none;"></div>
            </form>
          </div>
          <div class="modal-footer modern-modal-footer">
            <button type="button" class="btn btn-cancel-modal" data-bs-dismiss="modal">
              <i class="bi bi-x-circle-fill me-1"></i>ביטול
            </button>
            <button type="button" class="btn btn-create-group" onclick="createGroup()">
              <i class="bi bi-check-circle-fill me-1"></i>צור קבוצה
            </button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', createHtml);
    injected = true;
  }
  if (!document.getElementById('myGroupsModal')) {
    const myGroupsHtml = `
    <div class="modal fade" id="myGroupsModal" tabindex="-1" aria-labelledby="myGroupsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content modern-group-modal">
          <div class="modal-header modern-modal-header">
            <h5 class="modal-title" id="myGroupsModalLabel">
              <i class="bi bi-people-fill me-2"></i>הקבוצות שלי
            </h5>
          </div>
          <div class="modal-body modern-modal-body">
            <div id="myGroupsList" class="list-group"></div>
          </div>
          <div class="modal-footer modern-modal-footer">
            <button type="button" class="btn btn-cancel-modal" data-bs-dismiss="modal">
              <i class="bi bi-x-circle-fill me-1"></i>סגור
            </button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', myGroupsHtml);
    injected = true;
  }
  if (injected) {
    console.log('Injected missing group modals into DOM');
  }
}

// Function to open my groups modal
function openMyGroupsModal(evt) {
  try {
    console.log('OPEN_MY_GROUPS_CLICK');
    if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
    // Ensure modal HTML exists; if not, inject it
    if (!document.getElementById('myGroupsModal')) {
      injectGroupModalsIfMissing();
    }
    // Check if modal exists, if not try to reinitialize
    if (!window.myGroupsModal || !myGroupsModal._element) {
      console.log('MyGroups modal not found, attempting to reinitialize...');
      reinitializeModals();
      
      // Check again after reinitializing
      if (!window.myGroupsModal || !myGroupsModal._element) {
        console.error('MyGroups modal still not available after reinitializing');
        showToast('שגיאה בפתיחת חלון הקבוצות', 'error');
        return;
      }
    }
    
    // Load and display user's groups
    loadMyGroups();
    
    // Show the modal using a fresh instance to avoid stale refs
    const modalEl = document.getElementById('myGroupsModal');
    let modalInstance;
    if (bootstrap.Modal.getOrCreateInstance) {
      modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    } else {
      modalInstance = new bootstrap.Modal(modalEl);
    }
    window.myGroupsModal = modalInstance; // keep global ref updated
    modalInstance.show();
  } catch (error) {
    console.error('Error opening my groups modal:', error);
    showToast('שגיאה בפתיחת חלון הקבוצות', 'error');
  }
}

// Function to create a new group
async function createGroup() {
  console.log('createGroup function called!');
  
  const groupName = document.getElementById('groupName').value.trim();
  const groupCategory = document.getElementById('groupCategory').value.trim();
  const groupDescription = document.getElementById('groupDescription').value.trim();
  const groupImage = document.getElementById('groupImage').files[0];
  
  console.log('Creating group with:', { groupName, groupCategory, groupDescription, hasImage: !!groupImage });
  
  // Validate required fields
  if (!groupName) {
    showGroupError('יש להזין שם לקבוצה');
    return;
  }
  
  // Hide previous errors
  document.getElementById('groupError').style.display = 'none';
  
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('name', groupName);
    if (groupDescription) {
      formData.append('description', groupDescription);
    }
    if (groupCategory) {
      formData.append('category', groupCategory);
    }
    if (groupImage) {
      formData.append('groupAvatar', groupImage);
    }
    
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      showGroupError(data.error || 'שגיאה ביצירת קבוצה');
      return;
    }
    
    // Success - close modal and show success message
    createGroupModal.hide();
    
    // Show group creation summary with description
    showGroupCreationSummary(groupName, groupCategory, groupDescription, data);
    
    // Clear form
    document.getElementById('groupName').value = '';
    document.getElementById('groupCategory').value = '';
    document.getElementById('groupDescription').value = '';
    document.getElementById('groupImage').value = '';
    
    // Reset avatar preview
    resetAvatarPreview();
    
    // Refresh my groups list if modal is open
    if (myGroupsModal._element.classList.contains('show')) {
      loadMyGroups();
    }
    
  } catch (err) {
    console.error('Error creating group:', err);
    showGroupError('שגיאה ביצירת קבוצה');
  }
}

// Helper function to show group errors
function showGroupError(message) {
  const errorElement = document.getElementById('groupError');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

// Initialize avatar gallery functionality (simplified for file upload only)
function initializeAvatarGallery() {
  console.log('Avatar gallery initialized (file upload only)');
}

// Reset avatar preview
function resetAvatarPreview() {
  const avatarPreview = document.getElementById('avatarPreview');
  
  // Reset preview to default
  if (avatarPreview) {
    avatarPreview.src = 'images/profile.jpg';
  }
}

// Preview group image when file is selected
function previewGroupImage(input) {
  const avatarPreview = document.getElementById('avatarPreview');
  
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      avatarPreview.src = e.target.result;
    };
    
    reader.readAsDataURL(input.files[0]);
  }
}

// Function to show group creation summary with description
function showGroupCreationSummary(groupName, groupCategory, groupDescription, groupData) {
  console.log('Showing group creation summary:', { groupName, groupCategory, groupDescription, groupData });
  
  // Create a temporary modal-like overlay to show the group creation summary
  const summaryOverlay = document.createElement('div');
  summaryOverlay.className = 'modal fade show d-block';
  summaryOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  summaryOverlay.style.position = 'fixed';
  summaryOverlay.style.top = '0';
  summaryOverlay.style.left = '0';
  summaryOverlay.style.width = '100%';
  summaryOverlay.style.height = '100%';
  summaryOverlay.style.zIndex = '1055';
  
  const summaryModal = document.createElement('div');
  summaryModal.className = 'modal-dialog modal-dialog-centered';
  summaryModal.innerHTML = `
    <div class="modal-content group-summary-modal">
      <div class="modal-header">
        <h5 class="modal-title">הקבוצה נוצרה בהצלחה! 🎉</h5>
        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
      </div>
      <div class="modal-body">
        <div class="text-center mb-3">
          <div class="mb-3">
            <img src="${safeImageUrl(groupData.imageUrl)}" 
                 class="rounded-circle" 
                 style="width: 80px; height: 80px; object-fit: cover;"
                 alt="תמונת קבוצה"
                 onerror="this.src='/images/profile.jpg'; console.log('Group summary image failed to load, using fallback:', this.src);"
                 onload="console.log('Group summary image loaded successfully:', this.src)">
          </div>
          <h4 class="text-primary">${groupName}</h4>
          ${groupDescription && groupDescription.trim() !== '' ? `<p class="text-muted mt-2">${groupDescription}</p>` : ''}
          ${groupCategory && groupCategory.trim() !== '' ? `<span class="badge bg-secondary">${groupCategory}</span>` : ''}
        </div>
        <div class="alert alert-success">
          <i class="bi bi-check-circle"></i>
          הקבוצה נוצרה בהצלחה וניתן כעת להוסיף חברים ולפרסם פוסטים!
        </div>
      </div>
      <div class="modal-footer justify-content-center">
        <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()">הבנתי</button>
      </div>
    </div>
  `;
  
  summaryOverlay.appendChild(summaryModal);
  document.body.appendChild(summaryOverlay);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (summaryOverlay.parentNode) {
      summaryOverlay.remove();
    }
  }, 5000);
}

// Function to manage group posts (admin only)
function manageGroupPosts(groupId) {
  // TODO: Implement post management modal
  alert('ניהול פוסטים - יושלם בקרוב!');
}

// Function to close all open modals
function closeAllModals() {
  console.log('closeAllModals called - searching for elements to remove...');
  
  // Close all modals with .modal class
  const modals = document.querySelectorAll('.modal.show, .modal.d-block');
  console.log(`Found ${modals.length} visible modals to remove:`, modals);
  modals.forEach(modal => {
    console.log('Removing modal:', modal);
    modal.remove();
  });
  
  // Also remove any remaining modal backdrops
  const backdrops = document.querySelectorAll('.modal-backdrop');
  console.log(`Found ${backdrops.length} backdrops to remove:`, backdrops);
  backdrops.forEach(backdrop => {
    console.log('Removing backdrop:', backdrop);
    backdrop.remove();
  });
  
  // Remove any fixed overlays that might be left
  const overlays = document.querySelectorAll('[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.5)"]');
  console.log(`Found ${overlays.length} overlays to remove:`, overlays);
  overlays.forEach(overlay => {
    console.log('Removing overlay:', overlay);
    overlay.remove();
  });
  
  // Force remove any remaining elements that might be blocking the screen
  const blockingElements = document.querySelectorAll('[style*="position: fixed"][style*="top: 0"][style*="left: 0"][style*="width: 100%"][style*="height: 100%"]');
  console.log(`Found ${blockingElements.length} blocking elements to remove:`, blockingElements);
  blockingElements.forEach(element => {
    console.log('Removing blocking element:', element);
    element.remove();
  });
  
  // Additional cleanup - remove any elements with high z-index that might be blocking
  const highZIndexElements = document.querySelectorAll('[style*="z-index: 1055"], [style*="z-index: 1054"], [style*="z-index: 1053"]');
  console.log(`Found ${highZIndexElements.length} high z-index elements:`, highZIndexElements);
  highZIndexElements.forEach(element => {
    if (element.classList.contains('modal') || element.classList.contains('modal-backdrop')) return;
  });
  
  // Force re-enable pointer events on body and main content
  document.body.style.pointerEvents = 'auto';
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    mainContent.style.pointerEvents = 'auto';
  }
  
  // Force re-enable sidebar
  const sidebar = document.querySelector('.sidebar-panel');
  if (sidebar) {
    sidebar.style.pointerEvents = 'auto';
    sidebar.style.zIndex = '';
  }
  
  console.log('closeAllModals completed');
}

// Function to check and remove any blocking elements
function checkForBlockingElements() {
  console.log('Checking for blocking elements...');
  
  // Check for modals
  const modals = document.querySelectorAll('.modal');
  console.log(`Found ${modals.length} modals:`, modals);
  
  // Check for backdrops
  const backdrops = document.querySelectorAll('.modal-backdrop');
  console.log(`Found ${backdrops.length} backdrops:`, backdrops);
  
  // Check for fixed overlays
  const overlays = document.querySelectorAll('[style*="position: fixed"]');
  console.log(`Found ${overlays.length} fixed elements:`, overlays);
  
  // Check for high z-index elements
  const highZIndex = document.querySelectorAll('[style*="z-index: 10"]');
  console.log(`Found ${highZIndex.length} high z-index elements:`, highZIndex);
  
  // Check pointer events on body
  console.log('Body pointer-events:', document.body.style.pointerEvents);
  
  // Check pointer events on main content
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    console.log('Main content pointer-events:', mainContent.style.pointerEvents);
  }
  
  return { modals: modals.length, backdrops: backdrops.length, overlays: overlays.length, highZIndex: highZIndex.length };
}

// Function to force re-enable all click events and pointer events
function forceReenableClickEvents() {
  console.log('Force re-enabling click events...');
  
  // Debug current state
  console.log('Body pointer-events before:', document.body.style.pointerEvents);
  console.log('Body modal-open class:', document.body.classList.contains('modal-open'));
  console.log('Body overflow before:', document.body.style.overflow);
  
  // Re-enable pointer events on body
  document.body.style.pointerEvents = 'auto';
  document.body.style.userSelect = 'auto';
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  
  // Re-enable pointer events on main content areas
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    mainContent.style.pointerEvents = 'auto';
    mainContent.style.userSelect = 'auto';
    console.log('Main content re-enabled');
  }
  
  // Re-enable pointer events on sidebar with debugging
  const sidebar = document.querySelector('.sidebar-panel');
  if (sidebar) {
    console.log('Sidebar pointer-events before:', sidebar.style.pointerEvents);
    sidebar.style.pointerEvents = 'auto';
    sidebar.style.userSelect = 'auto';
    sidebar.style.zIndex = '';
    console.log('Sidebar re-enabled, pointer-events after:', sidebar.style.pointerEvents);
  } else {
    console.log('Sidebar not found!');
  }
  
  // Re-enable pointer events on suggestions container
  const suggestions = document.getElementById('suggestionsContainer');
  if (suggestions) {
    suggestions.style.pointerEvents = 'auto';
    suggestions.style.userSelect = 'auto';
  }
  
  // Re-enable pointer events on all follow buttons
  const followButtons = document.querySelectorAll('.follow-btn');
  followButtons.forEach(button => {
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
  });
  
  // Re-enable pointer events on all sidebar links with debugging
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  console.log(`Found ${sidebarLinks.length} sidebar links`);
  sidebarLinks.forEach((link, index) => {
    console.log(`Sidebar link ${index} pointer-events before:`, link.style.pointerEvents);
    link.style.pointerEvents = 'auto';
    link.style.cursor = 'pointer';
    link.style.zIndex = '';
    console.log(`Sidebar link ${index} pointer-events after:`, link.style.pointerEvents);
  });
  
  // Remove any invisible overlays that might be blocking
  const invisibleOverlays = document.querySelectorAll('[style*="position: fixed"][style*="top: 0"][style*="left: 0"]');
  console.log(`Found ${invisibleOverlays.length} potential blocking overlays`);
  invisibleOverlays.forEach((overlay, index) => {
    if (!overlay.classList.contains('modal') && !overlay.classList.contains('modal-backdrop') && !overlay.classList.contains('story-overlay')) {
      console.log(`Removing suspicious overlay ${index}:`, overlay);
      overlay.remove();
    }
  });
  
  console.log('Click events re-enabled');
}

// Emergency function to reset UI state - call from console if sidebar gets stuck
window.emergencyUIReset = function() {
  console.log('Emergency UI Reset - Removing all modal state');
  
  // Remove all modals and backdrops
  document.querySelectorAll('.modal, .modal-backdrop').forEach(el => el.remove());
  
  // Reset body state
  document.body.classList.remove('modal-open');
  document.body.style.pointerEvents = 'auto';
  document.body.style.overflow = '';
  document.body.style.userSelect = 'auto';
  
  // Reset sidebar
  const sidebar = document.querySelector('.sidebar-panel');
  if (sidebar) {
    sidebar.style.pointerEvents = 'auto';
    sidebar.style.zIndex = '';
    sidebar.style.userSelect = 'auto';
  }
  
  // Reset all sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.style.pointerEvents = 'auto';
    link.style.cursor = 'pointer';
    link.style.zIndex = '';
  });
  
  // Reset main content
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    mainContent.style.pointerEvents = 'auto';
    mainContent.style.userSelect = 'auto';
  }
  
  // Remove any suspicious overlays
  document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
    if (!el.classList.contains('sidebar-panel') && !el.classList.contains('story-overlay')) {
      const hasModalBackdrop = el.classList.contains('modal') || el.classList.contains('modal-backdrop');
      if (hasModalBackdrop || (el.style.backgroundColor && el.style.backgroundColor.includes('rgba'))) {
        console.log('Removing suspicious overlay:', el);
        el.remove();
      }
    }
  });
  
  console.log('Emergency reset complete');
  return 'UI reset complete - sidebar should be clickable now';
};

// Nuclear option - completely reset all UI state and remove any blocking elements
window.nuclearUIReset = function() {
  console.log('NUCLEAR UI RESET - Removing ALL potential blocking elements');
  
  // Remove ALL modals and backdrops
  document.querySelectorAll('.modal, .modal-backdrop, [class*="modal"]').forEach(el => {
    console.log('Removing modal-related element:', el);
    el.remove();
  });
  
  // Remove any fixed positioned elements that aren't essential
  document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
    const isEssential = el.classList.contains('sidebar-panel') || 
                       el.classList.contains('story-overlay') || 
                       el.id === 'backToTopBtn' ||
                       el.classList.contains('story-toast');
    if (!isEssential) {
      console.log('Removing fixed positioned element:', el);
      el.remove();
    }
  });
  
  // Reset ALL body styles and classes
  document.body.className = document.body.className.replace(/modal[^\s]*/g, '');
  document.body.style.cssText = '';
  document.documentElement.style.cssText = '';
  
  // Force reset sidebar with higher z-index
  const sidebar = document.querySelector('.sidebar-panel');
  if (sidebar) {
    sidebar.style.cssText = 'pointer-events: auto !important; z-index: 9999 !important; position: fixed !important;';
    console.log('Sidebar force reset with high z-index');
  }
  
  // Force reset all sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.style.cssText = 'pointer-events: auto !important; cursor: pointer !important; z-index: 10000 !important;';
  });
  
  // Force reset main content
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    mainContent.style.cssText = 'pointer-events: auto !important;';
  }
  
  // Remove any CSS that might be blocking interactions
  const stylesToRemove = ['pointer-events: none', 'overflow: hidden', 'position: fixed'];
  document.querySelectorAll('*').forEach(el => {
    stylesToRemove.forEach(style => {
      if (el.style.cssText.includes(style) && !el.classList.contains('sidebar-panel')) {
        el.style.pointerEvents = 'auto';
        if (el.tagName !== 'BODY') el.style.overflow = '';
      }
    });
  });
  
  console.log('Nuclear reset complete - everything should work now');
  return 'Nuclear reset complete - if this doesn\'t work, there\'s a deeper issue';
};

// Force reinitialize all group modals
window.fixGroupModals = function() {
  console.log('Fixing group modals...');
  
  // Force reinitialize
  reinitializeModals();
  
  // Test if they work
  const createWorks = !!(window.createGroupModal && createGroupModal._element);
  const myGroupsWorks = !!(window.myGroupsModal && myGroupsModal._element);
  
  console.log('Modal status after fix:', {
    createGroupModal: createWorks,
    myGroupsModal: myGroupsWorks
  });
  
  if (createWorks && myGroupsWorks) {
    return 'Group modals fixed successfully!';
  } else {
    return 'Some modals still not working - check console for details';
  }
};


// Function to get current user ID from JWT token
function getCurrentUserId() {
  try {
    const token = getToken();
    if (!token) return null;
    
    // Decode JWT token to get user ID
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

// Function to get current user's following list
async function getCurrentUserFollowing() {
  try {
    const token = getToken();
    if (!token) {
      console.log('No JWT token found for getting following list');
      return [];
    }
    
    const response = await fetch('/api/users/me/following', {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Current user following list:', data);
      return data.data || [];
    } else {
      console.error('Failed to get following list:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error getting following list:', error);
    return [];
  }
}

// Function to refresh suggestions after follow/unfollow
async function refreshSuggestions() {
  try {
    console.log(' Refreshing suggestions...');
    await loadSuggestions();
    console.log('Suggestions refreshed successfully');
  } catch (error) {
    console.error(' Error refreshing suggestions:', error);
  }
}

// Function to open group details modal
async function openGroupDetails(groupId) {
  // Guard: prevent double-open if a previous click is still processing
  if (window.isOpeningGroupDetails) {
    console.log('openGroupDetails ignored: already opening');
    return;
  }
  window.isOpeningGroupDetails = true;
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch group details');
    }
    
    const group = await res.json();

    // Clean any existing group details modals/backdrops before opening new one
    document.querySelectorAll('#groupDetailsModal').forEach(el => el.remove());
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

    showGroupDetailsModal(group);
  } catch (error) {
    console.error('Error fetching group details:', error);
    showToast('שגיאה בטעינת פרטי הקבוצה', 'error');
  }
  // Release the guard shortly after to allow future opens
  setTimeout(() => { window.isOpeningGroupDetails = false; }, 200);
}

// Function to show group details modal
function showGroupDetailsModal(group) {
  // Close any existing modals first
  closeAllModals();
  
  const currentUserId = getCurrentUserId();
  const isAdmin = group.admin && (group.admin._id === currentUserId || group.admin === currentUserId);
  
  // Handle admin info - could be string ID or populated object
  const adminUsername = group.admin ? (typeof group.admin === 'string' ? 'לא ידוע' : group.admin.username) : 'לא ידוע';
  const adminId = group.admin ? (typeof group.admin === 'string' ? group.admin : group.admin._id) : null;
        const adminAvatar = group.admin ? (typeof group.admin === 'string' ? '/images/profile.jpg' : (group.admin.avatarUrl || '/images/profile.jpg')) : '/images/profile.jpg';
  
  // Create modal HTML
  const modalHTML = `
    <div class="modal fade show d-block" id="groupDetailsModal" tabindex="-1" role="dialog" aria-labelledby="groupDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content group-details-modal modern-group-modal">
          <div class="modal-header modern-modal-header">
            <h5 class="modal-title" id="groupDetailsModalLabel">
              <i class="bi bi-people-fill me-2"></i>פרטי הקבוצה
            </h5>
            <button type="button" class="btn-close modern-close-btn" onclick="closeGroupDetailsModal()" aria-label="Close"></button>
          </div>
          <div class="modal-body modern-modal-body">
            <div class="group-header-section text-center mb-4">
              <div class="group-avatar-container">
                <img src="${safeImageUrl(group.imageUrl)}" 
                     class="group-avatar" 
                     alt="תמונת קבוצה"
                     onerror="this.src='/images/profile.jpg'; console.log('Group details image failed to load, using fallback:', this.src);"
                     onload="console.log('Group details image loaded successfully:', this.src)">
                <div class="group-avatar-ring"></div>
              </div>
              <h3 class="group-name">${group.name}</h3>
              ${group.description ? `<p class="group-description">${group.description}</p>` : ''}
              ${group.category ? `<span class="group-category-badge">${group.category}</span>` : ''}
            </div>
            
            <div class="group-stats-section">
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="stat-card admin-card">
                    <div class="stat-content">
                      <h6 class="stat-label">מנהל הקבוצה</h6>
                      <div class="stat-value">
                        <img src="${adminAvatar}" class="admin-avatar" alt="${adminUsername}" onerror="this.src='/images/profile.jpg'">
                        <span class="admin-name">${adminUsername}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="stat-card members-count-card">
                    <div class="stat-content">
                      <h6 class="stat-label">מספר חברים</h6>
                      <div class="stat-value">
                        <span class="members-count">${group.members.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="members-section mt-4">
              <div class="section-header">
                <h6 class="section-title">
                  <i class="bi bi-person-lines-fill me-2"></i>רשימת חברים
                </h6>
                ${isAdmin ? `<button class="btn btn-add-member" onclick="showAddMemberModal('${group._id}')">
                  <i class="bi bi-person-plus-fill me-1"></i>הוסף חבר
                </button>` : ''}
              </div>
              <div class="members-list-container">
                ${group.members.map(member => {
                  const memberId = typeof member === 'string' ? member : member._id;
                  const memberUsername = typeof member === 'string' ? 'משתמש' : (member.username || 'משתמש');
                  const memberAvatar = typeof member === 'string' ? '/images/profile.jpg' : (member.avatarUrl || '/images/profile.jpg');
                  const isNotAdmin = adminId && memberId !== adminId;
                  
                  return `
                    <div class="member-item">
                      <div class="member-info">
                        <img src="${memberAvatar}" class="member-avatar" alt="${memberUsername}" onerror="this.src='/images/profile.jpg'">
                        <span class="member-name">${memberUsername}</span>
                      </div>
                      ${isAdmin && isNotAdmin ? 
                        `<button class="btn btn-remove-member" onclick="removeMember('${group._id}', '${memberId}')">
                          <i class="bi bi-person-x-fill"></i>
                        </button>` : 
                        ''
                      }
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer modern-modal-footer">
            ${isAdmin ? `
              <button type="button" class="btn btn-edit-group" onclick="editGroup('${group._id}')">
                <i class="bi bi-pencil-fill me-1"></i>ערוך קבוצה
              </button>
              <button type="button" class="btn btn-delete-group" onclick="deleteGroup('${group._id}')">
                <i class="bi bi-trash-fill me-1"></i>מחק קבוצה
              </button>
            ` : ''}
            <button type="button" class="btn btn-close-modal" onclick="closeGroupDetailsModal()">
              <i class="bi bi-x-circle-fill me-1"></i>סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  // Mirror Bootstrap behavior for body
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  
  // Add modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.style.zIndex = '1054';
  document.body.appendChild(backdrop);
}

// Function to close group details modal
function closeGroupDetailsModal(event) {
  // Prevent event propagation issues
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  console.log('closeGroupDetailsModal called');
  
  // Prevent multiple calls
  if (window.closingModal) {
    console.log('Modal already closing, ignoring duplicate call');
    return;
  }
  window.closingModal = true;
  
  // Remove all existing instances and backdrops just in case duplicates exist
  const modals = document.querySelectorAll('#groupDetailsModal');
  const backdrops = document.querySelectorAll('.modal-backdrop');
  modals.forEach(m => { console.log('Removing group details modal:', m); m.remove(); });
  backdrops.forEach(b => { console.log('Removing backdrop:', b); b.remove(); });
  
  // Additional cleanup to ensure no blocking elements remain
  const remainingModals = document.querySelectorAll('.modal.show, .modal.d-block');
  const remainingBackdrops = document.querySelectorAll('.modal-backdrop.show');
  console.log(`Visible modals: ${remainingModals.length}, visible backdrops: ${remainingBackdrops.length}`);
  
  // Ensure pointer events are enabled
  document.body.style.pointerEvents = 'auto';
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    mainContent.style.pointerEvents = 'auto';
  }
  // Reset body modal state
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  
  // Reset flag after operation
  setTimeout(() => {
    window.closingModal = false;
  }, 100);
  
  console.log('closeGroupDetailsModal completed');
}

// Function to edit group
async function editGroup(groupId) {
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch group details');
    }
    
    const group = await res.json();
    showEditGroupModal(group);
  } catch (error) {
    console.error('Error fetching group details:', error);
    showToast('שגיאה בטעינת פרטי הקבוצה', 'error');
  }
}

// Function to show edit group modal
function showEditGroupModal(group) {
  // Close any existing modals first
  closeAllModals();
  
  const modalHTML = `
    <div class="modal fade show d-block" id="editGroupModal" tabindex="-1" role="dialog" aria-labelledby="editGroupModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="editGroupModalLabel">ערוך קבוצה</h5>
            <button type="button" class="btn-close" onclick="closeEditGroupModal()" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="editGroupForm">
              <div class="mb-3">
                <label for="editGroupName" class="form-label">שם הקבוצה</label>
                <input type="text" id="editGroupName" class="form-control" value="${group.name}" required dir="rtl">
              </div>
              <div class="mb-3">
                <label for="editGroupDescription" class="form-label">תיאור הקבוצה</label>
                <textarea id="editGroupDescription" class="form-control" rows="3" dir="rtl">${group.description || ''}</textarea>
              </div>
              <div class="mb-3">
                <label for="editGroupCategory" class="form-label">קטגוריה</label>
                <input type="text" id="editGroupCategory" class="form-control" value="${group.category || ''}" dir="rtl">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="saveGroupChanges('${group._id}')">שמור שינויים</button>
            <button type="button" class="btn btn-secondary" onclick="closeEditGroupModal()">ביטול</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  // Mirror Bootstrap behavior for body
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  
  // Add modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.style.zIndex = '1054';
  document.body.appendChild(backdrop);
}

// ===== PROFILE MODAL FUNCTIONS =====

// Function to open profile modal
function openProfileModal() {
  try {
    console.log('OPEN_PROFILE_MODAL_CLICK');
    
    // Ensure modal HTML exists
    if (!document.getElementById('profileModal')) {
      console.error('Profile modal not found');
      return;
    }
    
    // Show the modal
    const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    profileModal.show();
    
    // Load profile data
    loadProfileData();
    
  } catch (error) {
    console.error('Error opening profile modal:', error);
    showToast('שגיאה בפתיחת הפרופיל', 'error');
  }
}

// Function to load profile data
async function loadProfileData() {
  try {
    // Show loading state
    document.getElementById('profilePostsLoading').classList.remove('d-none');
    document.getElementById('profilePostsEmpty').classList.add('d-none');
    document.getElementById('profilePostsError').classList.add('d-none');
    document.getElementById('profilePostsGrid').classList.add('d-none');
    
    // Get current user data
    const currentUser = window.currentUser;
    if (!currentUser) {
      throw new Error('לא נמצא משתמש מחובר');
    }
    
    // Update profile header
    document.getElementById('profileModalUsername').textContent = currentUser.username || 'משתמש';
    document.getElementById('profileModalAvatar').src = currentUser.avatarUrl || 'images/profile.jpg';
    
    // Update location if available
    const locationElement = document.getElementById('profileModalLocation');
    if (currentUser.location) {
      locationElement.innerHTML = `<i class="bi bi-geo-alt me-2"></i><span class="location-text">${currentUser.location}</span>`;
    } else {
      locationElement.innerHTML = `<i class="bi bi-geo-alt me-2"></i><span class="location-text">לא צוין מיקום</span>`;
    }
    
    // Load user stats (including posts count)
    await loadUserStats();
    
    // Load user posts
    await loadProfilePosts();
    
    // Add filter tab functionality
    setupFilterTabs();
    
  } catch (error) {
    console.error('Error loading profile data:', error);
    showToast('שגיאה בטעינת נתוני הפרופיל', 'error');
  }
}

// Function to load user stats
async function loadUserStats() {
  try {
    const response = await fetch('/api/users/me/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('שגיאה בטעינת סטטיסטיקות המשתמש');
    }
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('profileFollowersCount').textContent = data.data.followersCount;
      document.getElementById('profileFollowingCount').textContent = data.data.followingCount;
      document.getElementById('profilePostsCount').textContent = data.data.postsCount;
    }
    
  } catch (error) {
    console.error('Error loading user stats:', error);
    // Don't show error toast for stats, just log it
  }
}

// Function to load profile posts
async function loadProfilePosts() {
  try {
    const currentUser = window.currentUser;
    if (!currentUser) {
      throw new Error('לא נמצא משתמש מחובר');
    }
    
    console.log('Loading profile posts for user:', currentUser);
    console.log('User ID:', currentUser.userId);
    console.log('User ID type:', typeof currentUser.userId);
    console.log('User ID length:', currentUser.userId.length);
    console.log('User ID value:', JSON.stringify(currentUser.userId));
    console.log('Token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
    
    // Also check if we have the correct user data
    console.log('Full currentUser object:', JSON.stringify(currentUser, null, 2));
    
    const response = await fetch(`/api/posts/search/by-author/${currentUser.userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    console.log('Profile posts response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Profile posts response error:', errorText);
      throw new Error(`שגיאה בטעינת הפוסטים: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Profile posts data:', data);
    
    if (data.success) {
      const posts = data.data;
      console.log('Found posts:', posts.length);
      
      // Hide loading, show posts
      document.getElementById('profilePostsLoading').classList.add('d-none');
      
      if (posts.length === 0) {
        document.getElementById('profilePostsEmpty').classList.remove('d-none');
      } else {
        document.getElementById('profilePostsGrid').classList.remove('d-none');
        renderProfilePosts(posts);
      }
    } else {
      throw new Error(data.error || 'שגיאה בטעינת הפוסטים');
    }
    
  } catch (error) {
    console.error('Error loading profile posts:', error);
    
    // Hide loading, show error
    document.getElementById('profilePostsLoading').classList.add('d-none');
    document.getElementById('profilePostsError').classList.remove('d-none');
  }
}

// Function to render profile posts
function renderProfilePosts(posts) {
  const grid = document.getElementById('profilePostsGrid');
  grid.innerHTML = '';
  
  posts.forEach((post, index) => {
    const postElement = createProfilePostElement(post);
    
    // Add staggered animation delay
    postElement.style.animationDelay = `${index * 0.1}s`;
    
    grid.appendChild(postElement);
  });
}

// Function to create profile post element
function createProfilePostElement(post) {
  const postDiv = document.createElement('div');
  postDiv.className = 'profile-post-item';
  
  // Set media type for filtering
  let mediaType = 'text';
  if (post.mediaType === 'video' && post.mediaUrl) {
    mediaType = 'video';
  } else if (post.mediaUrl) {
    mediaType = 'image';
  }
  postDiv.setAttribute('data-media-type', mediaType);
  
  let mediaElement = '';
  
  if (post.mediaType === 'video' && post.mediaUrl) {
    mediaElement = `<video src="${post.mediaUrl}" muted></video>`;
  } else if (post.mediaUrl) {
    mediaElement = `<img src="${post.mediaUrl}" alt="תמונת פוסט" />`;
  } else {
    // Text post - create a text preview
    const textPreview = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');
    mediaElement = `<div class="text-post-preview">${textPreview}</div>`;
  }
  
  const statsHtml = `
    <div class="profile-post-stats">
      <i class="bi bi-heart-fill me-1"></i>${post.likes?.length || 0}
      <i class="bi bi-chat-fill ms-2 me-1"></i>${post.comments?.length || 0}
    </div>
  `;
  
  postDiv.innerHTML = `
    ${mediaElement}
    ${statsHtml}
  `;
  
  return postDiv;
}

// Function to setup filter tabs
function setupFilterTabs() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      filterTabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Get filter value
      const filter = tab.getAttribute('data-filter');
      
      // Apply filter
      applyPostFilter(filter);
    });
  });
}

// Function to apply post filter
function applyPostFilter(filter) {
  const postsGrid = document.getElementById('profilePostsGrid');
  const posts = postsGrid.querySelectorAll('.profile-post-item');
  
  posts.forEach(post => {
    const mediaType = post.getAttribute('data-media-type');
    
    if (filter === 'all') {
      post.style.display = 'block';
    } else if (filter === 'posts' && mediaType === 'image') {
      post.style.display = 'block';
    } else if (filter === 'videos' && mediaType === 'video') {
      post.style.display = 'block';
    } else {
      post.style.display = 'none';
    }
  });
}



// Function to open post details (placeholder for now)
function openPostDetails(post) {
  console.log('Opening post details:', post);
  // TODO: Implement post details view
  showToast('פתיחת פרטי פוסט - תכונה בהכנה', 'info');
}


// Function to open edit profile modal
function openEditProfileModal() {
  console.log('Opening edit profile modal');
  
  // Populate form with current user data
  const currentUser = window.currentUser;
  if (currentUser) {
    document.getElementById('editUsername').value = currentUser.username || '';
    document.getElementById('editLocation').value = currentUser.location || '';
    document.getElementById('editBio').value = currentUser.bio || '';
    
    // Set current avatar
    const avatarSrc = currentUser.avatarUrl || 'images/profile.jpg';
    document.getElementById('editProfileAvatar').src = avatarSrc;
  }
  
  // Show the modal
  const editProfileModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  editProfileModal.show();
  
  // Setup file input handler
  setupProfilePictureUpload();
}

// Function to setup profile picture upload
function setupProfilePictureUpload() {
  const fileInput = document.getElementById('editProfilePictureInput');
  const avatarImg = document.getElementById('editProfileAvatar');
  
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      // Preview the image
      const reader = new FileReader();
      reader.onload = function(e) {
        avatarImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// Function to save profile changes
async function saveProfileChanges() {
  console.log('Saving profile changes...');
  
  // Get form data
  const username = document.getElementById('editUsername').value.trim();
  const location = document.getElementById('editLocation').value.trim();
  const bio = document.getElementById('editBio').value.trim();
  const fileInput = document.getElementById('editProfilePictureInput');
  
  // Validation
  if (!username) {
    showEditProfileError('שם משתמש הוא שדה חובה');
    return;
  }
  
  // Show loading state
  showEditProfileLoading(true);
  hideEditProfileMessages();
  
  try {
    // Prepare form data for multipart upload
    const formData = new FormData();
    formData.append('username', username);
    formData.append('location', location);
    formData.append('bio', bio);
    
    if (fileInput.files[0]) {
      formData.append('avatar', fileInput.files[0]);
    }
    
    // Send update request
    const response = await fetch('/api/users/me/update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'שגיאה בעדכון הפרופיל');
    }
    
    const result = await response.json();
    console.log('Profile updated successfully:', result);
    
    // Update local user data
    if (window.currentUser) {
      window.currentUser.username = username;
      window.currentUser.location = location;
      window.currentUser.bio = bio;
      if (result.data.avatarUrl) {
        window.currentUser.avatarUrl = result.data.avatarUrl;
      }
    }
    
    // Update all UI elements
    updateProfileUI();
    
    // Show success message
    showEditProfileSuccess();
    
    // Close modal after delay
    setTimeout(() => {
      const editProfileModal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
      if (editProfileModal) {
        editProfileModal.hide();
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showEditProfileError(error.message);
  } finally {
    showEditProfileLoading(false);
  }
}

// Function to update profile UI across the entire feed
function updateProfileUI() {
  const currentUser = window.currentUser;
  if (!currentUser) return;
  
  console.log('Updating profile UI with:', currentUser);
  
  // Update sidebar
  const sidebarUsername = document.getElementById('sidebarUsername');
  const sidebarProfilePic = document.getElementById('sidebarProfilePic');
  if (sidebarUsername) sidebarUsername.textContent = currentUser.username;
  if (sidebarProfilePic && currentUser.avatarUrl) {
    sidebarProfilePic.src = currentUser.avatarUrl;
  }
  
  // Update profile modal
  const profileModalUsername = document.getElementById('profileModalUsername');
  const profileModalAvatar = document.getElementById('profileModalAvatar');
  const profileModalLocation = document.getElementById('profileModalLocation');
  const profileModalBio = document.getElementById('profileModalBio');
  
  if (profileModalUsername) profileModalUsername.textContent = currentUser.username;
  if (profileModalAvatar && currentUser.avatarUrl) {
    profileModalAvatar.src = currentUser.avatarUrl;
  }
  
  if (profileModalLocation) {
    const locationText = currentUser.location ? currentUser.location : 'לא צוין מיקום';
    profileModalLocation.innerHTML = `
      <i class="bi bi-geo-alt me-2"></i>
      <span class="location-text">${locationText}</span>
    `;
  }
  
  if (profileModalBio) {
    profileModalBio.textContent = currentUser.bio || 'ברוכים הבאים לפרופיל שלי! ';
  }
  
  // Update all posts by this user in the feed
  updateUserPostsInFeed(currentUser);
  
  console.log('Profile UI updated successfully');
}

// Function to update user posts in the feed
function updateUserPostsInFeed(currentUser) {
  // Update post author names and avatars
  const postElements = document.querySelectorAll('.post-item');
  postElements.forEach(postElement => {
    const authorElement = postElement.querySelector('.post-author-name');
    const avatarElement = postElement.querySelector('.post-author-avatar');
    
    if (authorElement && avatarElement) {
      // Check if this post belongs to the current user
      const postAuthorId = postElement.getAttribute('data-author-id');
      if (postAuthorId === currentUser.userId) {
        authorElement.textContent = currentUser.username;
        if (currentUser.avatarUrl) {
          avatarElement.src = currentUser.avatarUrl;
        }
      }
    }
  });
}

// Helper functions for edit profile modal states
function showEditProfileLoading(show) {
  const loadingElement = document.getElementById('editProfileLoading');
  if (loadingElement) {
    loadingElement.classList.toggle('d-none', !show);
  }
}

function showEditProfileSuccess() {
  const successElement = document.getElementById('editProfileSuccess');
  if (successElement) {
    successElement.classList.remove('d-none');
  }
}

function showEditProfileError(message) {
  const errorElement = document.getElementById('editProfileError');
  const errorMessageElement = document.getElementById('editProfileErrorMessage');
  if (errorElement && errorMessageElement) {
    errorMessageElement.textContent = message;
    errorElement.classList.remove('d-none');
  }
}

function hideEditProfileMessages() {
  const successElement = document.getElementById('editProfileSuccess');
  const errorElement = document.getElementById('editProfileError');
  if (successElement) successElement.classList.add('d-none');
  if (errorElement) errorElement.classList.add('d-none');
}

// Function to close edit group modal
function closeEditGroupModal() {
  console.log('closeEditGroupModal called');
  
  const modal = document.getElementById('editGroupModal');
  const backdrop = document.querySelector('.modal-backdrop');
  
  if (modal) {
    console.log('Removing edit group modal:', modal);
    modal.remove();
  }
  
  if (backdrop) {
    console.log('Removing backdrop:', backdrop);
    backdrop.remove();
  }
  
  // Additional cleanup to ensure no blocking elements remain
  const remainingModals = document.querySelectorAll('.modal.show, .modal.d-block');
  const remainingBackdrops = document.querySelectorAll('.modal-backdrop.show');
  
  console.log(`Visible modals: ${remainingModals.length}, visible backdrops: ${remainingBackdrops.length}`);
  
  // Ensure pointer events are enabled
  document.body.style.pointerEvents = 'auto';
  const mainContent = document.querySelector('.feed-wrapper, .main-content');
  if (mainContent) {
    mainContent.style.pointerEvents = 'auto';
  }
  // Reset body modal state
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  
  console.log('closeEditGroupModal completed');
}

// Function to save group changes
async function saveGroupChanges(groupId) {
  const name = document.getElementById('editGroupName').value.trim();
  const description = document.getElementById('editGroupDescription').value.trim();
  const category = document.getElementById('editGroupCategory').value.trim();
  
  if (!name) {
    showToast('שם הקבוצה הוא שדה חובה', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description, category })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'שגיאה בעדכון הקבוצה');
    }
    
    showToast('הקבוצה עודכנה בהצלחה', 'success');
    
    // Close modal immediately and force UI reset
    console.log('Closing edit group modal after successful update...');
    closeEditGroupModal();
    
    // Immediately force UI reset without waiting
    console.log('Immediate UI reset after save...');
    forceReenableClickEvents();
    
    // Additional immediate cleanup: remove only dynamic modals/backdrops, keep static app modals
    document.querySelectorAll('.modal, .modal-backdrop').forEach(el => {
      const id = el.id || '';
      const keep = id === 'createGroupModal' || id === 'myGroupsModal' || id === 'sharePostModal' || id === 'shareSuccessModal' || id === 'createPostModal';
      if (!keep) el.remove();
    });
    
    // Double-check after a short delay
    setTimeout(() => {
      console.log('Secondary cleanup check...');
      forceReenableClickEvents();
      
      // Force sidebar re-enable specifically
      const sidebar = document.querySelector('.sidebar-panel');
      if (sidebar) {
        sidebar.style.pointerEvents = 'auto';
        sidebar.style.zIndex = '';
        console.log('Sidebar force re-enabled');
      }
      
      // Force sidebar links re-enable
      document.querySelectorAll('.sidebar-link').forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.cursor = 'pointer';
      });
      
      console.log('Secondary cleanup completed');
    }, 50);
    
    // Try to refresh groups if the modal exists and is shown
    try {
      if (window.myGroupsModal && myGroupsModal._element && myGroupsModal._element.classList.contains('show')) {
        loadMyGroups();
      }
    } catch (e) {
      console.log('MyGroups modal state check failed, skipping refresh:', e);
    }
  } catch (error) {
    console.error('Error updating group:', error);
    showToast(error.message, 'error');
  }
}

// Function to delete group
async function deleteGroup(groupId) {
  if (!confirm('האם אתה בטוח שברצונך למחוק את הקבוצה? פעולה זו אינה הפיכה.')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'שגיאה במחיקת הקבוצה');
    }
    
    showToast('הקבוצה נמחקה בהצלחה', 'success');
    
    // Close modal and refresh groups
    closeAllModals();
    if (myGroupsModal._element.classList.contains('show')) {
      loadMyGroups();
    }
  } catch (error) {
    console.error('Error deleting group:', error);
    showToast(error.message, 'error');
  }
}

// Function to show add member modal with following users
async function showAddMemberModal(groupId) {
  try {
    // Close any existing modals first
    closeAllModals();
    
    // Fetch current user's following list
    console.log('Fetching following users...');
    const followingRes = await fetch('/api/users/me/following', {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Following response status:', followingRes.status);
    
    if (!followingRes.ok) {
      const errorText = await followingRes.text();
      console.error('Following API error:', errorText);
      throw new Error('שגיאה בטעינת רשימת המשתמשים');
    }
    
    const followingData = await followingRes.json();
    console.log('Following data:', followingData);
    
    // Handle different response structures
    let following = [];
    if (followingData.data && Array.isArray(followingData.data)) {
      following = followingData.data;
    } else if (Array.isArray(followingData)) {
      following = followingData;
    } else if (followingData.following && Array.isArray(followingData.following)) {
      following = followingData.following;
    }
    
    console.log('Processed following:', following);
    
    if (!following || following.length === 0) {
      // Try to fetch all users as fallback
      try {
        const allUsersRes = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (allUsersRes.ok) {
          const allUsersData = await allUsersRes.json();
          following = allUsersData.data || allUsersData || [];
          console.log('Using all users as fallback:', following);
        }
      } catch (fallbackError) {
        console.error('Fallback user fetch failed:', fallbackError);
      }
      
      if (!following || following.length === 0) {
        showToast('לא ניתן לטעון משתמשים', 'error');
        return;
      }
    }
    
    // Fetch current group to check existing members
    const groupRes = await fetch(`/api/groups/${groupId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!groupRes.ok) {
      throw new Error('שגיאה בטעינת פרטי הקבוצה');
    }
    
    const groupData = await groupRes.json();
    const existingMemberIds = groupData.members ? groupData.members.map(member => 
      typeof member === 'string' ? member : member._id
    ) : [];
    
    // Filter out users who are already in the group
    const availableUsers = following.filter(user => {
      const userId = user._id || user.id;
      if (!userId) {
        console.error('User without ID found during filtering:', user);
        return false;
      }
      return !existingMemberIds.includes(userId);
    });
    
    // Normalize user objects to have _id field for consistency
    availableUsers.forEach(user => {
      if (!user._id && user.id) {
        user._id = user.id;
      }
    });
    
    console.log('Available users after filtering:', availableUsers);
    console.log('Users with IDs:', availableUsers.map(u => ({ username: u.username, id: u._id || u.id })));
    
    if (availableUsers.length === 0) {
      showToast('כל המשתמשים שאתה עוקב אחריהם כבר חברים בקבוצה', 'info');
      return;
    }
    
    // Store available users globally for search functionality
    window.currentAvailableUsers = availableUsers;
    window.currentGroupId = groupId;
    
    // Create modal HTML with modern Instagram bubbly design
    const modalHTML = `
      <div class="modal fade show d-block" id="addMemberModal" tabindex="-1" role="dialog" aria-labelledby="addMemberModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" style="max-width: 500px;">
          <div class="modal-content modern-group-modal">
            <div class="modal-header modern-modal-header">
              <h5 class="modal-title mb-0" id="addMemberModalLabel">
                <i class="bi bi-person-plus-fill me-2"></i>הוסף חברים לקבוצה
              </h5>
            </div>
            <div class="modal-body modern-modal-body" style="padding: 25px;">
              <div class="search-container mb-4">
                <div class="input-group-modern">
                  <span class="input-group-text-modern">
                    <i class="bi bi-search"></i>
                  </span>
                  <input type="text" class="form-control-modern" placeholder="חיפוש משתמשים..." 
                         onkeyup="filterUsers(this.value, '${groupId}')">
                </div>
              </div>
              <div class="users-container-modern" style="max-height: 400px; overflow-y: auto; border-radius: 15px; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);">
                ${availableUsers.map(user => {
                  const userId = user._id || user.id || '';
                  const userName = user.username || 'משתמש';
                  const userAvatar = user.avatarUrl || '/images/profile.jpg';
                  
                  if (!userId) {
                    console.error('User without valid ID found:', user);
                    return '';
                  }
                  
                  return `
                    <div class="modern-user-item" 
                         onclick="addUserToGroup('${groupId}', '${userId}', '${userName}')"
                         style="padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.4); cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px);">
                      <div class="d-flex align-items-center">
                        <div class="modern-avatar-container" style="margin-left: 15px; position: relative;">
                          <img src="${userAvatar}" 
                               class="modern-avatar" 
                               style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
                               alt="${userName}" 
                               onerror="this.src='/images/profile.jpg'">
                          <div style="position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background: linear-gradient(45deg, #ff6b6b, #ffa500); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
                            <i class="bi bi-plus" style="font-size: 10px; color: white; font-weight: bold;"></i>
                          </div>
                        </div>
                        <div class="flex-grow-1">
                          <div class="modern-username" style="font-size: 16px; font-weight: 700; color: #2d3748; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(0,0,0,0.1);">${userName}</div>
                          <div class="modern-subtitle" style="font-size: 13px; color: #718096; font-weight: 500;">לחץ להוספה לקבוצה</div>
                        </div>
                        <div class="modern-add-indicator" style="opacity: 0.7;">
                          <i class="bi bi-chevron-left" style="font-size: 18px; color: #a0aec0;"></i>
                        </div>
                      </div>
                    </div>
                  `;
                }).filter(item => item !== '').join('')}
              </div>
            </div>
            <div class="modal-footer modern-modal-footer">
              <button type="button" class="btn btn-cancel-modal" onclick="closeAddMemberModal()">
                <i class="bi bi-x-circle-fill me-1"></i>ביטול
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '1054';
    document.body.appendChild(backdrop);
    
  } catch (error) {
    console.error('Error showing add member modal:', error);
    showToast(error.message, 'error');
  }
}

// Function to close add member modal
function closeAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  const backdrop = document.querySelector('.modal-backdrop');
  
  if (modal) {
    modal.remove();
  }
  
  if (backdrop) {
    backdrop.remove();
  }
}

// Function to add member to group (called from modal)
async function addUserToGroup(groupId, userId, username) {
  try {
    console.log('Adding user to group:', { groupId, userId, username });
    
    // Validate userId
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid userId provided:', userId);
      showToast('שגיאה: מזהה משתמש לא תקין', 'error');
      return;
    }
    
    // Add user to group
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      console.error('Server error response:', error);
      throw new Error(error.error || 'שגיאה בהוספת החבר');
    }
    
    showToast(`המשתמש ${username} נוסף לקבוצה בהצלחה`, 'success');
    
    // Close modal and refresh group details
    closeAddMemberModal();
    openGroupDetails(groupId);
    
  } catch (error) {
    console.error('Error adding user to group:', error);
    showToast(error.message, 'error');
  }
}

// Function to filter users in the modal
function filterUsers(searchTerm, groupId) {
  if (!window.currentAvailableUsers) return;
  
  const filteredUsers = window.currentAvailableUsers.filter(user => 
    user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Normalize user objects to have _id field for consistency
  filteredUsers.forEach(user => {
    if (!user._id && user.id) {
      user._id = user.id;
    }
  });
  
  const usersContainer = document.querySelector('.users-container-modern');
  if (!usersContainer) return;
  
  usersContainer.innerHTML = filteredUsers.map(user => {
    const userId = user._id || user.id || '';
    const userName = user.username || 'משתמש';
    const userAvatar = user.avatarUrl || '/images/profile.jpg';
    
    if (!userId) {
      console.error('User without valid ID found in filter:', user);
      return '';
    }
    
    return `
      <div class="modern-user-item" 
           onclick="addUserToGroup('${groupId}', '${userId}', '${userName}')"
           style="padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.4); cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px);">
        <div class="d-flex align-items-center">
          <div class="modern-avatar-container" style="margin-left: 15px; position: relative;">
            <img src="${userAvatar}" 
                 class="modern-avatar" 
                 style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
                 alt="${userName}" 
                 onerror="this.src='/images/profile.jpg'">
            <div style="position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background: linear-gradient(45deg, #ff6b6b, #ffa500); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              <i class="bi bi-plus" style="font-size: 10px; color: white; font-weight: bold;"></i>
            </div>
          </div>
          <div class="flex-grow-1">
            <div class="modern-username" style="font-size: 16px; font-weight: 700; color: #2d3748; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(0,0,0,0.1);">${userName}</div>
            <div class="modern-subtitle" style="font-size: 13px; color: #718096; font-weight: 500;">לחץ להוספה לקבוצה</div>
          </div>
          <div class="modern-add-indicator" style="opacity: 0.7;">
            <i class="bi bi-chevron-left" style="font-size: 18px; color: #a0aec0;"></i>
          </div>
        </div>
      </div>
    `;
  }).filter(item => item !== '').join('');
  
  // Show message if no results
  if (filteredUsers.length === 0) {
    usersContainer.innerHTML = `
      <div class="text-center py-5" style="color: rgba(113, 128, 150, 0.8); font-size: 16px; font-weight: 500;">
        <i class="bi bi-search mb-3" style="font-size: 3rem; opacity: 0.5;"></i>
        <div style="text-shadow: 0 1px 3px rgba(0,0,0,0.1);">לא נמצאו משתמשים התואמים לחיפוש</div>
      </div>
    `;
  }
}

// Function to remove member from group
async function removeMember(groupId, memberId) {
  if (!confirm('האם אתה בטוח שברצונך להסיר חבר זה מהקבוצה?')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'שגיאה בהסרת החבר');
    }
    
    showToast('החבר הוסר מהקבוצה בהצלחה', 'success');
    
    // Refresh group details
    openGroupDetails(groupId);
  } catch (error) {
    console.error('Error removing member:', error);
    showToast(error.message, 'error');
  }
}

// Function to manage group members (admin only)
function manageGroupMembers(groupId) {
  // TODO: Implement member management modal
  alert('ניהול חברים - יושלם בקרוב!');
}

// Function to go to group page
function goToGroupPage(groupId) {
  alert(`מעבר לעמוד הקבוצה: ${groupId}`);
  
}

// Function to load and display user's groups
async function loadMyGroups() {
  const groupsList = document.getElementById('myGroupsList');
  if (!groupsList) {
    console.error('myGroupsList element not found');
    return;
  }
  
  groupsList.innerHTML = '<div class="text-center text-muted">טוען קבוצות...</div>';
  
  try {
    const res = await fetch('/api/groups/my', {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch groups');
    }
    
    const groups = await res.json();
    
    console.log('Groups loaded:', groups);
    
    if (groups.length === 0) {
      groupsList.innerHTML = '<div class="text-center text-muted">אין לך קבוצות עדיין. צור קבוצה חדשה!</div>';
      return;
    }
    
    // Display groups
    groupsList.innerHTML = '';
    groups.forEach(group => {
      console.log('Processing group:', group.name, 'imageUrl:', group.imageUrl);
              const fullImageUrl = safeImageUrl(group.imageUrl);
      console.log('Full image URL:', fullImageUrl);
      
      // Test if image exists
      if (group.imageUrl) {
        console.log('Testing image accessibility for:', group.name);
        console.log('  - Original imageUrl:', group.imageUrl);
        console.log('  - Full URL:', fullImageUrl);
        
        fetch(fullImageUrl)
          .then(response => {
            if (response.ok) {
              console.log('Image exists and is accessible:', fullImageUrl);
            } else {
              console.log('Image not accessible:', fullImageUrl, 'Status:', response.status);
            }
          })
          .catch(error => {
            console.log('Error accessing image:', fullImageUrl, 'Error:', error);
          });
      }
      
      // Debug: Check if we're getting the right imageUrl from the database
      console.log('Group data from DB:', {
        name: group.name,
        imageUrl: group.imageUrl,
        fullImageUrl: fullImageUrl,
        hasImageUrl: !!group.imageUrl,
        imageUrlType: typeof group.imageUrl
      });
      
      // Force the image to use the group's imageUrl, not fallback
      if (group.imageUrl && group.imageUrl.trim() !== '') {
        console.log('Using group image:', fullImageUrl);
      } else {
        console.log('No group image, using fallback');
      }
      
      // Check if the image file actually exists on the server
      if (group.imageUrl && group.imageUrl.trim() !== '') {
        const img = new Image();
        img.onload = function() {
          console.log('Group image loaded successfully:', fullImageUrl);
        };
        img.onerror = function() {
          console.log('Group image failed to load:', fullImageUrl);
          console.log('Trying to access:', fullImageUrl);
        };
        img.src = fullImageUrl;
      }
      
      // Check if current user is admin
      const currentUserId = getCurrentUserId();
      const isAdmin = group.admin && (group.admin._id === currentUserId || group.admin === currentUserId);
      
      const groupCard = document.createElement('div');
      groupCard.className = 'modern-group-card';
      groupCard.innerHTML = `
        <div class="group-card-content">
          <div class="group-card-header">
            <div class="group-avatar-section">
              <img src="${fullImageUrl}" 
                   class="group-card-avatar" 
                   alt="תמונת קבוצה"
                   onerror="this.src='/images/profile.jpg'; console.log('Group card image failed to load, using fallback:', this.src);"
                   onload="console.log('Group card image loaded successfully:', this.src)">
              <div class="group-card-avatar-ring"></div>
            </div>
            <div class="group-info-section">
              <div class="group-title-section">
                <h6 class="group-card-title">
                  <a href="#" onclick="openGroupDetails('${group._id}')" class="group-title-link">
                    ${group.name}
                  </a>
                </h6>
                ${isAdmin ? '<span class="group-role-badge admin-badge"><i class="bi bi-crown-fill me-1"></i>מנהל</span>' : '<span class="group-role-badge member-badge"><i class="bi bi-person-fill me-1"></i>חבר</span>'}
              </div>
              ${group.description ? `<p class="group-description-text">${group.description}</p>` : ''}
              ${group.category ? `<span class="group-category-tag">${group.category}</span>` : ''}
            </div>
          </div>
          <div class="group-card-footer">
            <div class="group-stats">
              <span class="group-members-count">
                <i class="bi bi-people-fill me-1"></i>${group.members.length} חברים
              </span>
              <span class="group-creation-date">
                <i class="bi bi-calendar-event me-1"></i>נוצרה ב-${new Date(group.createdAt).toLocaleDateString('he-IL')}
              </span>
            </div>
            <button class="btn-view-group" onclick="openGroupDetails('${group._id}')">
              <i class="bi bi-eye-fill me-1"></i>צפה בקבוצה
            </button>
          </div>
        </div>
      `;
      groupsList.appendChild(groupCard);
    });
    
  } catch (err) {
    console.error('Error loading groups:', err);
    groupsList.innerHTML = '<div class="text-center text-danger">שגיאה בטעינת הקבוצות</div>';
  }
}




// Global functions for testing avatar functionality
window.refreshCurrentUser = refreshCurrentUser;
window.switchUser = switchUser;
window.clearCurrentUser = clearCurrentUser;
window.fetchCurrentUser = fetchCurrentUser;
window.updateUserAvatar = updateUserAvatar;
window.setAvatar = setAvatar;
window.showAvatarStatus = showAvatarStatus;
window.setRealAvatars = setRealAvatars;

// Global functions for stories
window.closeStoryOverlay = closeStoryOverlay;
window.prevStory = prevStory;
window.nextStory = nextStory;

// Add event listeners for story overlay
document.addEventListener('DOMContentLoaded', function() {
  // Global keyboard event listener
  document.addEventListener('keydown', function(e) {
    const overlay = document.getElementById('storyOverlay');
    const isOverlayOpen = overlay && !overlay.classList.contains('d-none');
    
    if (isOverlayOpen) {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeStoryOverlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStory();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextStory();
          break;
        case 'Tab':
          // Keep focus within overlay
          const focusableElements = overlay.querySelectorAll(
            'button, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
          break;
      }
    }
  });
});




// Function to update user avatar
async function updateUserAvatar(avatarUrl) {
  try {
    const token = getToken();
    if (!token) {
      console.error('No token found, cannot update avatar');
      return null;
    }

    console.log('Updating user avatar to:', avatarUrl);
    
    const response = await fetch('/api/users/me/avatar', {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatarUrl })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Avatar updated successfully:', result);
      
      // Update local user data
      if (window.currentUser) {
        window.currentUser.avatarUrl = avatarUrl;
        updateAvatarDisplays();
      }
      
      return result;
    } else {
      console.error('Failed to update avatar:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error updating avatar:', error);
    return null;
  }
}



// Function to manually set avatar for testing
window.setAvatar = function(avatarUrl) {
  if (!window.currentUser) {
    console.log('No current user - login first');
    return 'No current user - login first';
  }
  
  console.log(`Manually setting avatar for ${window.currentUser.username} to:`, avatarUrl);
  updateUserAvatar(avatarUrl);
  return `Avatar set to: ${avatarUrl}`;
};

// Function to show current avatar status
window.showAvatarStatus = function() {
  console.log('=== AVATAR STATUS ===');
  
  if (window.currentUser) {
    console.log('Current user:', window.currentUser.username);
    console.log('Current avatar URL:', window.currentUser.avatarUrl);
    console.log('Avatar source:', window.currentUser.avatarUrl === '/images/profile.jpg' ? 'Default' : 'Custom');
  } else {
    console.log('No current user');
  }
  
  // Check if avatar images are loading
  const sidebarAvatar = document.getElementById('sidebarProfilePic');
  const suggestionsAvatar = document.getElementById('suggestionsProfilePic');
  
  if (sidebarAvatar) {
    console.log('Sidebar avatar src:', sidebarAvatar.src);
    console.log('Sidebar avatar alt:', sidebarAvatar.alt);
  }
  
  if (suggestionsAvatar) {
    console.log('Suggestions avatar src:', suggestionsAvatar.src);
    console.log('Suggestions avatar alt:', suggestionsAvatar.alt);
  }
  
  console.log('=== END STATUS ===');
  return 'Avatar status logged to console';
};

// Function to set real avatars in database for testing
window.setRealAvatars = function() {
  console.log('Setting real avatars in database for testing...');
  
                    const realAvatars = {
            'stav': '/images/profile.jpg',
            'tal': '/images/logo.png', 
            'lior': '/images/Instagram_icon.png',
            'maya': '/images/threads.svg'
          };
  
  const currentUsername = window.currentUser?.username;
  if (currentUsername && realAvatars[currentUsername]) {
    const avatarUrl = realAvatars[currentUsername];
    console.log(`Setting REAL avatar in DB for ${currentUsername} to:`, avatarUrl);
    
    // This will update the database
    updateUserAvatar(avatarUrl).then(result => {
      if (result) {
        console.log('Avatar updated in database successfully');
        // Refresh user data to get the updated avatar
        fetchCurrentUser();
      } else {
        console.log('Failed to update avatar in database');
      }
    });
  } else {
    console.log('No current user or no real avatar available');
  }
  
  return 'Real avatars being set in database - check console for results';
};

// Stories synchronization functions
function addUserStories(username) {
    console.log(`Adding stories for user: ${username}`);
}

function removeUserStories(username) {
    console.log(`Removing stories for user: ${username}`);
    // Remove stories from the current stories container ONLY
    const storiesContainer = document.getElementById('storiesContainer');
    if (storiesContainer) {
        const storyElements = storiesContainer.querySelectorAll(`[data-username="${username}"]`);
        storyElements.forEach(story => story.remove());
    }
}

function refreshStories() {
    console.log('Refreshing stories to sync with following state');
    
    // Safety check: Make sure we're only affecting the stories container
    const storiesContainer = document.getElementById('storiesContainer');
    if (!storiesContainer) {
        console.warn('Stories container not found, skipping refresh');
        return;
    }
    

    
    // Re-fetch stories based on current following list
    if (typeof loadStories === 'function') {
        loadStories();
        
        
    } else {
        console.log('loadStories function not available, skipping refresh');
    }
}

async function refreshPosts() {
    console.log(' Refreshing posts to sync with following state');
    
    // Safety check: Make sure we're only affecting the posts container
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) {
        console.warn(' Posts container not found, skipping refresh');
        return;
    }
    
    console.log('Posts container found, fetching fresh posts...');
    
    try {
        const token = getToken();
        if (!token) {
            console.log('No token available for posts refresh');
            return;
        }
        
        // Fetch fresh posts from backend
        const response = await fetch("/api/posts", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        
        if (response.ok) {
            const allPosts = await response.json();
            console.log('Fresh posts loaded:', allPosts.length);
            
            // Sort posts by creation date: newest first
            const sortedPosts = allPosts.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA; // Newest first
            });
            
            // Update global posts and re-render
            currentPosts = sortedPosts;
            console.log(' Re-rendering posts with fresh data...');
            renderPosts(currentPosts);
            
            // Update localStorage
            localStorage.setItem('feed_posts', JSON.stringify(currentPosts));
            
            console.log('Posts refreshed and re-rendered successfully');
        } else {
            console.warn(' Failed to fetch fresh posts:', response.status);
        }
    } catch (error) {
        console.error('Error refreshing posts:', error);
    }
}

// Enhanced error handling for follow/unfollow operations
function showFollowError(message, type = 'error') {
    const toastMessage = type === 'error' ? `שגיאה: ${message}` : message;
    showToast(toastMessage, type);
}

// Validate follow button state
function validateFollowButton(button) {
    if (!button) return false;
    if (!button.classList.contains('follow-btn')) return false;
    if (!button.getAttribute('data-username')) return false;
    return true;
}

// DASHBOARD FUNCTIONALITY

// Dashboard global variables
var dashboardData = [];
var likesChart = null;
var commentsChart = null;
var sharesChart = null;

// Open dashboard modal
function openDashboardModal() {
    console.log('Opening dashboard modal...');
    
    // Initialize dashboardData if not already done
    if (!dashboardData) {
        dashboardData = [];
    }
    
    const modalElement = document.getElementById('dashboardModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Listen for modal shown event to ensure it's fully displayed
    modalElement.addEventListener('shown.bs.modal', function() {
        console.log('Modal is now fully shown, loading data...');
        loadDashboardData();
    }, { once: true }); // Use { once: true } to run only once
    
    modal.show();
}

// Load dashboard data from backend
async function loadDashboardData() {
    try {
        showDashboardLoading(true);
        
        const token = getToken();
        console.log('Token available:', !!token);
        
        if (!token) {
            console.warn('No authentication token found');
            showDashboardError(true);
            
            // Update error message to be more specific
            const errorDiv = document.getElementById('dashboardError');
            if (errorDiv) {
                errorDiv.innerHTML = `
                    <i class="bi bi-person-x text-warning mb-3" style="font-size: 3rem;"></i>
                    <p class="text-muted">אנא התחבר כדי לצפות בלוח הבקרה</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='index.html'">
                        <i class="bi bi-box-arrow-in-right me-1"></i>התחבר
                    </button>
                `;
            }
            return;
        }
        
        console.log('Fetching dashboard data from /api/posts/dashboard');
        
        const response = await fetch('/api/posts/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response error:', errorText);
            
            let errorMessage = '';
            switch (response.status) {
                case 401:
                    errorMessage = 'אסימון האימות לא תקף. אנא התחבר שוב.';
                    break;
                case 403:
                    errorMessage = 'אין הרשאה לצפות בנתונים אלה.';
                    break;
                case 404:
                    errorMessage = 'לא נמצאו נתונים לתצוגה.';
                    break;
                case 500:
                    errorMessage = 'שגיאה פנימית בשרת. אנא נסה שוב מאוחר יותר.';
                    break;
                default:
                    errorMessage = `שגיאת שרת: ${response.status}`;
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('Dashboard response:', result);
        
        if (result.success && result.data) {
            dashboardData = result.data;
            console.log('Dashboard data loaded successfully:', dashboardData.length, 'posts');
            console.log('Dashboard data:', dashboardData);
            
            if (dashboardData.length === 0) {
                console.log('No posts found, showing empty state');
                showDashboardEmpty(true);
            } else {
                console.log('Showing dashboard content and creating charts');
                showDashboardContent();
                
                // Add a small delay to ensure DOM is ready
                setTimeout(() => {
                    console.log('Creating charts after DOM update');
                    createDashboardCharts();
                    // Create thumbnails after charts are ready
                    setTimeout(() => {
                        createThumbnails();
                    }, 200);
                }, 100);
            }
        } else {
            throw new Error(result.error || result.message || 'תגובה לא תקינה מהשרת');
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        console.error('Error stack:', error.stack);
        showDashboardError(true);
        
        // Show a toast with the error message
        if (typeof showToast === 'function') {
            showToast(`שגיאה בטעינת לוח הבקרה: ${error.message}`, 'error');
        }
    } finally {
        showDashboardLoading(false);
    }
}

// Show/hide dashboard states
function showDashboardLoading(show) {
    const loading = document.getElementById('dashboardLoading');
    const content = document.querySelector('#dashboardModal .row');
    const empty = document.getElementById('dashboardEmpty');
    const error = document.getElementById('dashboardError');
    
    if (show) {
        loading.classList.remove('d-none');
        content.classList.add('d-none');
        empty.classList.add('d-none');
        error.classList.add('d-none');
    } else {
        loading.classList.add('d-none');
    }
}

function showDashboardContent() {
    const content = document.querySelector('#dashboardModal .row');
    const empty = document.getElementById('dashboardEmpty');
    const error = document.getElementById('dashboardError');
    
    content.classList.remove('d-none');
    empty.classList.add('d-none');
    error.classList.add('d-none');
}

function showDashboardEmpty(show) {
    const empty = document.getElementById('dashboardEmpty');
    const content = document.querySelector('#dashboardModal .row');
    const error = document.getElementById('dashboardError');
    
    if (show) {
        empty.classList.remove('d-none');
        content.classList.add('d-none');
        error.classList.add('d-none');
    }
}

function showDashboardError(show) {
    const error = document.getElementById('dashboardError');
    const content = document.querySelector('#dashboardModal .row');
    const empty = document.getElementById('dashboardEmpty');
    
    if (show) {
        error.classList.remove('d-none');
        content.classList.add('d-none');
        empty.classList.add('d-none');
    }
}


// Create D3.js charts
function createDashboardCharts() {
    try {
        console.log('Creating dashboard charts with data:', dashboardData);
        
        if (!dashboardData || !Array.isArray(dashboardData)) {
            console.error('Invalid dashboardData:', dashboardData);
            return;
        }
        
        createLikesChart();
        createCommentsChart();
        createSharesChart();
        createThumbnails();
    } catch (error) {
        console.error('Error creating dashboard charts:', error);
    }
}

// Create likes bar chart
function createLikesChart() {
    try {
        const container = document.getElementById('likesChart');
        if (!container) {
            console.error('Likes chart container not found');
            return;
        }
        
        console.log('Creating likes chart with Canvas, container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
        
        // Clear existing chart
        container.innerHTML = '';
        
        if (!dashboardData || !Array.isArray(dashboardData) || dashboardData.length === 0) {
            console.log('No data available for likes chart');
            return;
        }
    
        // Chart dimensions
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        let width = container.offsetWidth - margin.left - margin.right;
        const height = 320 - margin.top - margin.bottom;
        
        // Ensure minimum width
        if (width < 200) {
            width = 400; // fallback width
            console.log('Container width too small, using fallback width:', width);
        }
    
    // Create Canvas
    const canvas = d3.select(container)
        .append('canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('width', (width + margin.left + margin.right) + 'px')
        .style('height', (height + margin.top + margin.bottom) + 'px')
        .classed('chart-canvas likes-canvas', true);
    
    const context = canvas.node().getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Scale for high DPI displays
    canvas.attr('width', (width + margin.left + margin.right) * dpr)
          .attr('height', (height + margin.top + margin.bottom) * dpr);
    context.scale(dpr, dpr);
    
    // Create Canvas gradient
    const canvasGradient = context.createLinearGradient(0, margin.top, 0, margin.top + height);
    canvasGradient.addColorStop(0, '#a855f7');
    canvasGradient.addColorStop(1, '#e9d5ff');
    
            // Prepare data - keep original order to match thumbnails
        const reversedData = [...dashboardData];
        const data = reversedData.map((post, index) => ({
            index: index,
            id: post.id,
            label: `תמונה ${index + 1}`,
            value: post.likeCount,
            post: post,
            originalIndex: dashboardData.length - 1 - index // Keep track of original index for thumbnails
        }));
    
    // Scales - use index instead of labels for positioning
    const xScale = d3.scaleBand()
        .domain(data.map((d, i) => i))
        .range([0, width])
        .padding(0.1);
    
    const maxValue = d3.max(data, d => d.value) || 1;
    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0]);
    
    // Store bar data for interaction
    const barData = data.map(d => ({
        x: margin.left + xScale(d.index),
        y: margin.top + yScale(d.value),
        width: xScale.bandwidth(),
        height: height - yScale(d.value),
        data: d
    }));
    
    // Animation variables
    let animationProgress = 0;
    const animationDuration = 800;
    const startTime = Date.now();
    
    // Rounded rectangle function
    function roundRect(ctx, x, y, width, height, radius) {
        if (height < radius * 2) radius = height / 2;
        if (width < radius * 2) radius = width / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // Draw function
    function drawChart() {
        // Clear canvas
        context.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        
        // Draw Y-axis labels using D3 scale
        context.font = '700 15px system-ui, -apple-system, sans-serif';
        context.fillStyle = '#475569';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        
        const tickValues = [];
        for (let i = 0; i <= maxValue; i++) {
            tickValues.push(i);
        }
        
        tickValues.forEach(tick => {
            const y = margin.top + yScale(tick);
            context.fillText(tick.toString(), margin.left - 10, y);
        });
        
        // Draw bars with animation
        barData.forEach((bar, barIndex) => {
            const animatedHeight = bar.height * animationProgress;
            const animatedY = margin.top + height - animatedHeight;
            
            // Check if this bar should be highlighted
            const isHighlighted = window.chartHighlights && 
                                window.chartHighlights['likes'] && 
                                window.chartHighlights['likes'].barIndex === barIndex;
            
            // Add shadow
            context.save();
            if (isHighlighted) {
                // Enhanced shadow and glow for highlighted bar
                context.shadowColor = 'rgba(168, 85, 247, 0.6)';
                context.shadowBlur = 20;
                context.shadowOffsetY = 5;
            } else {
                context.shadowColor = 'rgba(168, 85, 247, 0.25)';
                context.shadowBlur = 12;
                context.shadowOffsetY = 3;
            }
            
            // Draw bar
            context.fillStyle = canvasGradient;
            roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
            context.fill();
            
            // Add extra highlight effect for the specific bar
            if (isHighlighted) {
                context.restore();
                context.save();
                
                // Add bright outline
                context.strokeStyle = 'rgba(168, 85, 247, 0.8)';
                context.lineWidth = 3;
                roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
                context.stroke();
                
                // Add inner glow
                context.shadowColor = 'rgba(168, 85, 247, 0.4)';
                context.shadowBlur = 15;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;
                context.fillStyle = 'rgba(168, 85, 247, 0.1)';
                roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
                context.fill();
            }
            
            context.restore();
        });
    }
    
    // Animation loop
    function animate() {
        const elapsed = Date.now() - startTime;
        animationProgress = Math.min(elapsed / animationDuration, 1);
        
        drawChart();
        
        if (animationProgress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    // Add interaction handlers to canvas
    canvas.on('mousemove', function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        let isOverBar = false;
        
        barData.forEach(bar => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && 
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                canvas.style('cursor', 'pointer');
                isOverBar = true;
            }
        });
        
        if (!isOverBar) {
            canvas.style('cursor', 'default');
        }
    });
    
    canvas.on('click', function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        
        barData.forEach(bar => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && 
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                highlightBar('likes', bar.data.index);
            }
        });
    });
    
    // Add event listener for chart redraw
    canvas.node().addEventListener('redrawChart', function(event) {
        if (event.detail.chartType === 'likes') {
            drawChart();
        }
    });
    
    // Start animation
    animate();
    
    // Canvas rendering handles all drawing - no SVG axes needed
    } catch (error) {
        console.error('Error creating likes chart:', error);
    }
}

// Create comments bar chart
function createCommentsChart() {
    try {
        const container = document.getElementById('commentsChart');
        if (!container) {
            console.error('Comments chart container not found');
            return;
        }
        
        console.log('Creating comments chart, container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
        
        // Clear existing chart
        d3.select(container).selectAll("*").remove();
        
        if (!dashboardData || !Array.isArray(dashboardData) || dashboardData.length === 0) {
            console.log('No data available for comments chart');
            return;
        }
    
        // Chart dimensions
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        let width = container.offsetWidth - margin.left - margin.right;
        const height = 320 - margin.top - margin.bottom;
        
        // Ensure minimum width
        if (width < 200) {
            width = 400; // fallback width
            console.log('Container width too small, using fallback width:', width);
        }
    
    // Create Canvas
    const canvas = d3.select(container)
        .append('canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('width', (width + margin.left + margin.right) + 'px')
        .style('height', (height + margin.top + margin.bottom) + 'px')
        .classed('chart-canvas comments-canvas', true);
    
    const context = canvas.node().getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Scale for high DPI displays
    canvas.attr('width', (width + margin.left + margin.right) * dpr)
          .attr('height', (height + margin.top + margin.bottom) * dpr);
    context.scale(dpr, dpr);
    
    // Create Canvas gradient
    const canvasGradient = context.createLinearGradient(0, margin.top, 0, margin.top + height);
    canvasGradient.addColorStop(0, '#a855f7');
    canvasGradient.addColorStop(1, '#e9d5ff');
    
            // Prepare data - keep original order to match thumbnails
        const reversedData = [...dashboardData];
        const data = reversedData.map((post, index) => ({
            index: index,
            id: post.id,
            label: `תמונה ${index + 1}`,
            value: post.commentCount,
            post: post,
            originalIndex: dashboardData.length - 1 - index // Keep track of original index for thumbnails
        }));
    
    // Scales - use index instead of labels for positioning
    const xScale = d3.scaleBand()
        .domain(data.map((d, i) => i))
        .range([0, width])
        .padding(0.1);
    
    const maxValue = d3.max(data, d => d.value) || 1;
    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0]);
    
    // Store bar data for interaction
    const barData = data.map(d => ({
        x: margin.left + xScale(d.index),
        y: margin.top + yScale(d.value),
        width: xScale.bandwidth(),
        height: height - yScale(d.value),
        data: d
    }));
    
    // Animation variables
    let animationProgress = 0;
    const animationDuration = 800;
    const startTime = Date.now();
    
    // Rounded rectangle function
    function roundRect(ctx, x, y, width, height, radius) {
        if (height < radius * 2) radius = height / 2;
        if (width < radius * 2) radius = width / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // Draw function
    function drawChart() {
        // Clear canvas
        context.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        
        // Draw Y-axis labels using D3 scale
        context.font = '700 15px system-ui, -apple-system, sans-serif';
        context.fillStyle = '#475569';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        
        const tickValues = [];
        for (let i = 0; i <= maxValue; i++) {
            tickValues.push(i);
        }
        
        tickValues.forEach(tick => {
            const y = margin.top + yScale(tick);
            context.fillText(tick.toString(), margin.left - 10, y);
        });
        
        // Draw bars with animation
        barData.forEach((bar, barIndex) => {
            const animatedHeight = bar.height * animationProgress;
            const animatedY = margin.top + height - animatedHeight;
            
            // Check if this bar should be highlighted
            const isHighlighted = window.chartHighlights && 
                                window.chartHighlights['comments'] && 
                                window.chartHighlights['comments'].barIndex === barIndex;
            
            // Add shadow
            context.save();
            if (isHighlighted) {
                // Enhanced shadow and glow for highlighted bar
                context.shadowColor = 'rgba(168, 85, 247, 0.6)';
                context.shadowBlur = 20;
                context.shadowOffsetY = 5;
            } else {
                context.shadowColor = 'rgba(168, 85, 247, 0.25)';
                context.shadowBlur = 12;
                context.shadowOffsetY = 3;
            }
            
            // Draw bar
            context.fillStyle = canvasGradient;
            roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
            context.fill();
            
            // Add extra highlight effect for the specific bar
            if (isHighlighted) {
                context.restore();
                context.save();
                
                // Add bright outline
                context.strokeStyle = 'rgba(168, 85, 247, 0.8)';
                context.lineWidth = 3;
                roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
                context.stroke();
                
                // Add inner glow
                context.shadowColor = 'rgba(168, 85, 247, 0.4)';
                context.shadowBlur = 15;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;
                context.fillStyle = 'rgba(168, 85, 247, 0.1)';
                roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
                context.fill();
            }
            
            context.restore();
        });
    }
    
    // Animation loop
    function animate() {
        const elapsed = Date.now() - startTime;
        animationProgress = Math.min(elapsed / animationDuration, 1);
        
        drawChart();
        
        if (animationProgress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    // Add interaction handlers to canvas
    canvas.on('mousemove', function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        let isOverBar = false;
        
        barData.forEach(bar => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && 
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                canvas.style('cursor', 'pointer');
                isOverBar = true;
            }
        });
        
        if (!isOverBar) {
            canvas.style('cursor', 'default');
        }
    });
    
    canvas.on('click', function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        
        barData.forEach(bar => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && 
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                highlightBar('comments', bar.data.index);
            }
        });
    });
    
    // Add event listener for chart redraw
    canvas.node().addEventListener('redrawChart', function(event) {
        if (event.detail.chartType === 'comments') {
            drawChart();
        }
    });
    
    // Start animation
    animate();
    
    // Canvas rendering handles all drawing - no SVG axes needed
    } catch (error) {
        console.error('Error creating comments chart:', error);
    }
}

// Create shares bar chart
function createSharesChart() {
    try {
        const container = document.getElementById('sharesChart');
        if (!container) {
            console.error('Shares chart container not found');
            return;
        }
        
        console.log('Creating shares chart, container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
        
        // Clear existing chart
        d3.select(container).selectAll("*").remove();
        
        if (!dashboardData || !Array.isArray(dashboardData) || dashboardData.length === 0) {
            console.log('No data available for shares chart');
            return;
        }
    
        // Chart dimensions
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        let width = container.offsetWidth - margin.left - margin.right;
        const height = 320 - margin.top - margin.bottom;
        
        // Ensure minimum width
        if (width < 200) {
            width = 400; // fallback width
            console.log('Container width too small, using fallback width:', width);
        }
    
    // Create Canvas
    const canvas = d3.select(container)
        .append('canvas')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('width', (width + margin.left + margin.right) + 'px')
        .style('height', (height + margin.top + margin.bottom) + 'px')
        .classed('chart-canvas shares-canvas', true);
    
    const context = canvas.node().getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Scale for high DPI displays
    canvas.attr('width', (width + margin.left + margin.right) * dpr)
          .attr('height', (height + margin.top + margin.bottom) * dpr);
    context.scale(dpr, dpr);
    
    // Create Canvas gradient
    const canvasGradient = context.createLinearGradient(0, margin.top, 0, margin.top + height);
    canvasGradient.addColorStop(0, '#a855f7');
    canvasGradient.addColorStop(1, '#e9d5ff');
    
            // Prepare data - keep original order to match thumbnails
        const reversedData = [...dashboardData];
        const data = reversedData.map((post, index) => ({
            index: index,
            id: post.id,
            label: `תמונה ${index + 1}`,
            value: post.shareCount,
            post: post,
            originalIndex: dashboardData.length - 1 - index // Keep track of original index for thumbnails
        }));
    
    // Scales - use index instead of labels for positioning
    const xScale = d3.scaleBand()
        .domain(data.map((d, i) => i))
        .range([0, width])
        .padding(0.1);
    
    const maxValue = d3.max(data, d => d.value) || 1;
    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0]);
    
    // Store bar data for interaction
    const barData = data.map(d => ({
        x: margin.left + xScale(d.index),
        y: margin.top + yScale(d.value),
        width: xScale.bandwidth(),
        height: height - yScale(d.value),
        data: d
    }));
    
    // Animation variables
    let animationProgress = 0;
    const animationDuration = 800;
    const startTime = Date.now();
    
    // Rounded rectangle function
    function roundRect(ctx, x, y, width, height, radius) {
        if (height < radius * 2) radius = height / 2;
        if (width < radius * 2) radius = width / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // Draw function
    function drawChart() {
        // Clear canvas
        context.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        
        // Draw Y-axis labels using D3 scale
        context.font = '700 15px system-ui, -apple-system, sans-serif';
        context.fillStyle = '#475569';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        
        const tickValues = [];
        for (let i = 0; i <= maxValue; i++) {
            tickValues.push(i);
        }
        
        tickValues.forEach(tick => {
            const y = margin.top + yScale(tick);
            context.fillText(tick.toString(), margin.left - 10, y);
        });
        
        // Draw bars with animation
        barData.forEach((bar, barIndex) => {
            const animatedHeight = bar.height * animationProgress;
            const animatedY = margin.top + height - animatedHeight;
            
            // Check if this bar should be highlighted
            const isHighlighted = window.chartHighlights && 
                                window.chartHighlights['shares'] && 
                                window.chartHighlights['shares'].barIndex === barIndex;
            
            // Add shadow
            context.save();
            if (isHighlighted) {
                // Enhanced shadow and glow for highlighted bar
                context.shadowColor = 'rgba(168, 85, 247, 0.6)';
                context.shadowBlur = 20;
                context.shadowOffsetY = 5;
            } else {
                context.shadowColor = 'rgba(168, 85, 247, 0.25)';
                context.shadowBlur = 12;
                context.shadowOffsetY = 3;
            }
            
            // Draw bar
            context.fillStyle = canvasGradient;
            roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
            context.fill();
            
            // Add extra highlight effect for the specific bar
            if (isHighlighted) {
                context.restore();
                context.save();
                
                // Add bright outline
                context.strokeStyle = 'rgba(168, 85, 247, 0.8)';
                context.lineWidth = 3;
                roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
                context.stroke();
                
                // Add inner glow
                context.shadowColor = 'rgba(168, 85, 247, 0.4)';
                context.shadowBlur = 15;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 0;
                context.fillStyle = 'rgba(168, 85, 247, 0.1)';
                roundRect(context, bar.x, animatedY, bar.width, animatedHeight, 8);
                context.fill();
            }
            
            context.restore();
        });
    }
    
    // Animation loop
    function animate() {
        const elapsed = Date.now() - startTime;
        animationProgress = Math.min(elapsed / animationDuration, 1);
        
        drawChart();
        
        if (animationProgress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    // Add interaction handlers to canvas
    canvas.on('mousemove', function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        let isOverBar = false;
        
        barData.forEach(bar => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && 
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                canvas.style('cursor', 'pointer');
                isOverBar = true;
            }
        });
        
        if (!isOverBar) {
            canvas.style('cursor', 'default');
        }
    });
    
    canvas.on('click', function(event) {
        const [mouseX, mouseY] = d3.pointer(event);
        
        barData.forEach(bar => {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && 
                mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                highlightBar('shares', bar.data.index);
            }
        });
    });
    
    // Add event listener for chart redraw
    canvas.node().addEventListener('redrawChart', function(event) {
        if (event.detail.chartType === 'shares') {
            drawChart();
        }
    });
    
    // Start animation
    animate();
    
    // Canvas rendering handles all drawing - no SVG axes needed
    } catch (error) {
        console.error('Error creating shares chart:', error);
    }
}

// Create thumbnails below charts
function createThumbnails() {
    createLikesThumbnails();
    createCommentsThumbnails();
    createSharesThumbnails();
}

function createLikesThumbnails() {
    try {
        const container = document.getElementById('likesChartThumbnails');
        const chartContainer = document.getElementById('likesChart');
        if (!container || !chartContainer) {
            console.error('Likes thumbnails or chart container not found');
            return;
        }
        
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.height = '35px';
        
        if (!dashboardData || !Array.isArray(dashboardData)) {
            console.log('No data available for likes thumbnails');
            return;
        }
        
        // Use original order to match the chart
        dashboardData.forEach((post, index) => {
            const img = document.createElement('img');
            img.className = 'chart-thumbnail';
            img.src = toAbs(post.thumbnailUrl || '/images/post.png');
            img.alt = `Post ${index + 1}`;
            img.dataset.index = index;
            img.dataset.chart = 'likes';
            
            // Position images exactly below their corresponding chart bars
            const containerWidth = container.offsetWidth || 400;
            const margin = {top: 20, right: 30, bottom: 40, left: 40};
            const chartWidth = containerWidth - margin.left - margin.right;
            
            // Create scale similar to chart's xScale
            const bandWidth = chartWidth / dashboardData.length;
            const padding = bandWidth * 0.1; // Same as chart's padding(0.1)
            const barWidth = bandWidth - padding;
            
            // Position thumbnail at center of its corresponding bar
            const xPosition = margin.left + (index * bandWidth) + (bandWidth / 2) - 19; // 19 = half of thumbnail width (38px/2)
            img.style.left = `${xPosition}px`;
            img.style.top = '0px';
            
            img.onerror = function() {
                this.src = '/images/post.png';
            };
            
            // Add click event to highlight corresponding bar
            img.onclick = function() {
                highlightBar('likes', index);
            };
            
            container.appendChild(img);
        });
    } catch (error) {
        console.error('Error creating likes thumbnails:', error);
    }
}

function createCommentsThumbnails() {
    try {
        const container = document.getElementById('commentsChartThumbnails');
        const chartContainer = document.getElementById('commentsChart');
        if (!container || !chartContainer) {
            console.error('Comments thumbnails or chart container not found');
            return;
        }
        
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.height = '35px';
        
        if (!dashboardData || !Array.isArray(dashboardData)) {
            console.log('No data available for comments thumbnails');
            return;
        }
        
        // Use original order to match the chart
        dashboardData.forEach((post, index) => {
            const img = document.createElement('img');
            img.className = 'chart-thumbnail';
            img.src = toAbs(post.thumbnailUrl || '/images/post.png');
            img.alt = `Post ${index + 1}`;
            img.dataset.index = index;
            img.dataset.chart = 'comments';
            
            // Position images exactly below their corresponding chart bars
            const containerWidth = container.offsetWidth || 400;
            const margin = {top: 20, right: 30, bottom: 40, left: 40};
            const chartWidth = containerWidth - margin.left - margin.right;
            
            // Create scale similar to chart's xScale
            const bandWidth = chartWidth / dashboardData.length;
            const padding = bandWidth * 0.1; // Same as chart's padding(0.1)
            const barWidth = bandWidth - padding;
            
            // Position thumbnail at center of its corresponding bar
            const xPosition = margin.left + (index * bandWidth) + (bandWidth / 2) - 19; // 19 = half of thumbnail width (38px/2)
            img.style.left = `${xPosition}px`;
            img.style.top = '0px';
            
            img.onerror = function() {
                this.src = '/images/post.png';
            };
            
            // Add click event to highlight corresponding bar
            img.onclick = function() {
                highlightBar('comments', index);
            };
            
            container.appendChild(img);
        });
    } catch (error) {
        console.error('Error creating comments thumbnails:', error);
    }
}

function createSharesThumbnails() {
    try {
        const container = document.getElementById('sharesChartThumbnails');
        const chartContainer = document.getElementById('sharesChart');
        if (!container || !chartContainer) {
            console.error('Shares thumbnails or chart container not found');
            return;
        }
        
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.height = '35px';
        
        if (!dashboardData || !Array.isArray(dashboardData)) {
            console.log('No data available for shares thumbnails');
            return;
        }
        
        // Use original order to match the chart
        dashboardData.forEach((post, index) => {
            const img = document.createElement('img');
            img.className = 'chart-thumbnail';
            img.src = toAbs(post.thumbnailUrl || '/images/post.png');
            img.alt = `Post ${index + 1}`;
            img.dataset.index = index;
            img.dataset.chart = 'shares';
            
            // Position images exactly below their corresponding chart bars
            const containerWidth = container.offsetWidth || 400;
            const margin = {top: 20, right: 30, bottom: 40, left: 40};
            const chartWidth = containerWidth - margin.left - margin.right;
            
            // Create scale similar to chart's xScale
            const bandWidth = chartWidth / dashboardData.length;
            const padding = bandWidth * 0.1; // Same as chart's padding(0.1)
            const barWidth = bandWidth - padding;
            
            // Position thumbnail at center of its corresponding bar
            const xPosition = margin.left + (index * bandWidth) + (bandWidth / 2) - 19; // 19 = half of thumbnail width (38px/2)
            img.style.left = `${xPosition}px`;
            img.style.top = '0px';
            
            img.onerror = function() {
                this.src = '/images/post.png';
            };
            
            // Add click event to highlight corresponding bar
            img.onclick = function() {
                highlightBar('shares', index);
            };
            
            container.appendChild(img);
        });
    } catch (error) {
        console.error('Error creating shares thumbnails:', error);
    }
}

// Highlight thumbnail functions
function highlightThumbnail(chartType, index) {
    const selector = `.chart-thumbnail[data-chart="${chartType}"][data-index="${index}"]`;
    const thumbnail = document.querySelector(selector);
    if (thumbnail) {
        thumbnail.classList.add('highlighted');
    }
}

function removeHighlightThumbnail(chartType) {
    const thumbnails = document.querySelectorAll(`.chart-thumbnail[data-chart="${chartType}"]`);
    thumbnails.forEach(thumb => thumb.classList.remove('highlighted'));
}

// Highlight bar when clicking on thumbnail
function highlightBar(chartType, index) {
    console.log(`Highlighting bar ${index} in ${chartType} chart`);
    
    // Find the canvas element
    let chartContainerId;
    if (chartType === 'likes') {
        chartContainerId = 'likesChart';
    } else if (chartType === 'comments') {
        chartContainerId = 'commentsChart';
    } else if (chartType === 'shares') {
        chartContainerId = 'sharesChart';
    } else {
        console.error(`Unknown chart type: ${chartType}`);
        return;
    }
    const chartContainer = document.getElementById(chartContainerId);
    
    if (!chartContainer) {
        console.error(`Chart container ${chartContainerId} not found`);
        return;
    }
    
    // Find the canvas
    const canvas = chartContainer.querySelector('canvas');
    if (!canvas) {
        console.error('Canvas not found in chart container');
        return;
    }
    
    // Store reference to highlight specific bar
    if (!window.chartHighlights) {
        window.chartHighlights = {};
    }
    
    // Set highlight for specific chart and bar
    window.chartHighlights[chartType] = {
        barIndex: index,
        startTime: Date.now(),
        duration: 2000
    };
    
    // Trigger chart redraw to show highlight
    const redrawEvent = new CustomEvent('redrawChart', { 
        detail: { chartType: chartType } 
    });
    canvas.dispatchEvent(redrawEvent);
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
        if (window.chartHighlights[chartType] && 
            window.chartHighlights[chartType].barIndex === index) {
            delete window.chartHighlights[chartType];
            // Trigger redraw to remove highlight
            canvas.dispatchEvent(redrawEvent);
        }
    }, 2000);
}

// Set up auto-refresh (every 30 seconds when modal is open)
let dashboardRefreshInterval = null;

// Daily Fact Functionality
function openDailyFactModal() {
    // Change icon to gray (clicked state)
    const factIcon = document.querySelector('.fact-icon');
    if (factIcon) {
        factIcon.classList.add('clicked');
    }
    
    const modal = new bootstrap.Modal(document.getElementById('dailyFactModal'));
    modal.show();
    loadDailyFact();
}

function loadDailyFact() {
    const factContent = document.getElementById('factContent');
    
    // Show loading state
    factContent.innerHTML = `
        <div class="fact-loading">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">טוען...</span>
            </div>
            <p class="mt-2">טוען עובדה יומית...</p>
        </div>
    `;
    
    // Fetch new fact
    fetch('/api/fact/today')
        .then(response => {
            if (!response.ok) {
                // For 404 or other errors, still try to parse the response
                if (response.status === 404) {
                    return response.json().then(errorData => {
                        // If the backend sends a fallback, use it
                        throw new Error(errorData.error || 'No facts available today');
                    });
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(factData => {
            console.log('Received fact data:', factData);
            
            // Render the fact (no caching to allow multiple facts per day)
            renderFact(factData);
        })
        .catch(error => {
            console.error('Error loading daily fact:', error);
            
            // Show a fallback fact if API is completely unavailable
            const today = new Date();
            const hebrewMonths = [
                'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
            ];
            const todayHebrew = `${today.getDate()} ${hebrewMonths[today.getMonth()]}`;
            const fallbackFact = {
                year: today.getFullYear(),
                title: `היום הוא ${todayHebrew} - יום מיוחד!`,
                text: `🌟 כל יום בלוח השנה הוא יום היסטורי מרתק! ביום זה בעבר התרחשו אירועים חשובים שעיצבו את ההיסטוריה האנושית. אמנם איננו יכולים לטעון מידע ספציפי מויקיפדיה כרגע, אך אנו יודעים שכל יום מביא עמו הזדמנויות חדשות וזיכרונות מיוחדים! ✨`,
                pageUrl: 'https://he.wikipedia.org/wiki/היסטוריה',
                thumbnail: null,
                type: 'client_fallback'
            };
            
            // Try to render the fallback fact first
            try {
                renderFact(fallbackFact);
            } catch (renderError) {
                // If even the fallback fails, show error
                factContent.innerHTML = `
                    <div class="fact-error">
                        <i class="bi bi-exclamation-triangle-fill text-danger mb-2" style="font-size: 2rem;"></i>
                        <p><strong>שגיאה בטעינת העובדה היומית</strong></p>
                        <p class="small text-muted">${error.message}</p>
                        <button class="btn btn-outline-primary btn-sm mt-2" onclick="loadDailyFact()">
                            <i class="bi bi-arrow-clockwise me-1"></i>נסה שוב
                        </button>
                    </div>
                `;
            }
        });
}

function renderFact(factData) {
    const factContent = document.getElementById('factContent');
    
    let html = '';
    
    // Date badge - show full date instead of just year
    const today = new Date();
    const hebrewMonths = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    const fullDate = `${today.getDate()} ${hebrewMonths[today.getMonth()]} ${today.getFullYear()}`;
    html += `<div class="fact-date-badge">${fullDate}</div>`;
    
    // Fact text
    if (factData.text) {
        html += `<div class="fact-text">${factData.text}</div>`;
    }
    
    // Thumbnail
    if (factData.thumbnail) {
        html += `<img src="${factData.thumbnail}" alt="תמונה" class="fact-thumbnail" />`;
    }
    
    
    // If no content available
    if (!html) {
        html = `
            <div class="fact-error text-center">
                <i class="bi bi-info-circle-fill text-info mb-2" style="font-size: 2rem;"></i>
                <p>אין עובדות זמינות להיום</p>
                <p class="small text-muted">נסה שוב מחר</p>
            </div>
        `;
    }
    
    factContent.innerHTML = html;
}

// Setup modal event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Daily Fact Modal - reset icon when modal is closed
    const dailyFactModal = document.getElementById('dailyFactModal');
    if (dailyFactModal) {
        dailyFactModal.addEventListener('hidden.bs.modal', function() {
            // Remove clicked state from icon (back to yellow)
            const factIcon = document.querySelector('.fact-icon');
            if (factIcon) {
                factIcon.classList.remove('clicked');
            }
        });
    }
    
    const dashboardModal = document.getElementById('dashboardModal');
    if (dashboardModal) {
        dashboardModal.addEventListener('shown.bs.modal', function() {
            console.log('Dashboard modal shown event fired');
            // Start auto-refresh every 30 seconds
            dashboardRefreshInterval = setInterval(() => {
                console.log('Auto-refreshing dashboard data...');
                loadDashboardData();
            }, 30000);
        });
        
        dashboardModal.addEventListener('hidden.bs.modal', function() {
            console.log('Dashboard modal hidden event fired');
            // Stop auto-refresh when modal is closed
            if (dashboardRefreshInterval) {
                clearInterval(dashboardRefreshInterval);
                dashboardRefreshInterval = null;
            }
            
            // Clear dashboard data when modal is closed to ensure fresh load next time
            dashboardData = [];
        });
    }
});

//  FOLLOWERS MAP FUNCTIONALITY 

// Global variables for map functionality
var followersMap = null;
var followersMapData = [];
var followersMarkers = [];
var followersRefreshInterval = null;
var markerClusterer = null;

// Initialize Google Maps (callback from script)
function initMap() {
    console.log('Google Maps API loaded successfully');
}

// Open followers map modal
function openFollowersMapModal() {
    console.log('Opening followers map modal');
    
    const modal = new bootstrap.Modal(document.getElementById('followersMapModal'));
    modal.show();
    
    // Load map when modal is shown
    document.getElementById('followersMapModal').addEventListener('shown.bs.modal', function() {
        console.log('Followers map modal shown, loading map...');
        loadFollowersMap();
    }, { once: true });
}

// Load followers map
function loadFollowersMap() {
    console.log('Loading followers map...');
    
    showMapLoading();
    
    // Check if Google Maps is available
    if (typeof google === 'undefined' || !google.maps || window.googleMapsError) {
        console.error('Google Maps API not loaded or failed to load');
        console.log('Note: You need a valid Google Maps API key for production use');
        // Show error with proper Hebrew message
        showMapErrorWithMessage();
        return;
    }
    
    // Fetch followers geo data
    fetchFollowersGeoData()
        .then(data => {
            console.log('Followers geo data loaded:', data);
            
            // Ensure data is valid array
            if (!data || !Array.isArray(data)) {
                console.log('Invalid data received, using empty array');
                followersMapData = [];
                showMapEmpty();
                return;
            }
            
            followersMapData = data;
            
            if (data.length === 0) {
                console.log('No followers found');
                showMapEmpty();
                return;
            }
            
            try {
                // Initialize map
                initializeMap();
                
                // Create markers
                createFollowersMarkers();
                
                // Update count
                updateFollowersCount(data.length);
                
                // Show map
                showMapContent();
                
                // Start auto refresh
                startMapAutoRefresh();
                
            } catch (mapError) {
                console.error('Error creating map:', mapError);
                showMapError();
            }
        })
        .catch(error => {
            console.error('Error loading followers geo data:', error);
            showMapError();
        });
}

// Fetch followers geo data from API
async function fetchFollowersGeoData() {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token');
    }
    
    console.log('Fetching followers geo data from API...');
    
    try {
        const response = await fetch('/api/following/geo', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log('Following geo endpoint not found - returning empty array');
                return [];
            }
            const errorData = await response.text();
            console.error('API Error:', response.status, errorData);
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received followers geo data from API:', data);
        console.log('Number of followers:', data.length);
        if (data.length === 0) {
            console.log('API returned empty array - you may not be following anyone yet');
        }
        return data;
    } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        return [];
    }
}

// Initialize Google Map
function initializeMap() {
    console.log('Initializing Google Map...');
    
    const mapContainer = document.getElementById('followersMap');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    // Default center on Israel/Tel Aviv
    const defaultCenter = { lat: 32.0853, lng: 34.7818 };
    
    // Map options - view of entire Israel to show all followers
    const mapOptions = {
        zoom: 7, // Show entire Israel
        center: { lat: 31.5, lng: 34.75 }, // Center of Israel
        mapId: 'd6a9a1b52bbd6291d2e2c2a3', // Custom Map ID
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        minZoom: 6, // Allow viewing entire country
        maxZoom: 11, // Prevent zooming in to street level
        restriction: {
            latLngBounds: {
                north: 33.5,
                south: 29.0,
                west: 34.0,
                east: 36.0
            },
            strictBounds: false
        },
        // Additional styles to hide detailed street info
        styles: [
            {
                featureType: "road",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            },
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            },
            {
                featureType: "transit",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    };
    
    // Create map
    followersMap = new google.maps.Map(mapContainer, mapOptions);
    
    console.log('Google Map initialized');
}

// Create custom avatar markers
function createFollowersMarkers() {
    console.log('Creating followers markers...');
    
    // Clear existing markers
    clearFollowersMarkers();
    
    followersMarkers = [];
    
    // Check if we have valid data
    if (!followersMapData || !Array.isArray(followersMapData) || followersMapData.length === 0) {
        console.log('No followers data available for markers');
        showMapEmpty();
        return;
    }
    
    followersMapData.forEach((follower, index) => {
        try {
            // Create custom marker element
            const markerElement = createCustomMarkerElement(follower);
            
            // Use AdvancedMarkerElement (required for Map ID)
            let marker;
            try {
                if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                    marker = new google.maps.marker.AdvancedMarkerElement({
                        position: { lat: follower.lat, lng: follower.lng },
                        map: followersMap,
                        content: markerElement,
                        title: `${follower.username} - ${follower.city}`
                    });
                } else {
                    console.warn('AdvancedMarkerElement not available, using regular marker');
                    // Fallback to regular marker with custom icon
                    marker = new google.maps.Marker({
                        position: { lat: follower.lat, lng: follower.lng },
                        map: followersMap,
                        title: `${follower.username} - ${follower.city}`,
                        icon: {
                            url: follower.avatarUrl,
                            scaledSize: new google.maps.Size(44, 44),
                            anchor: new google.maps.Point(22, 22)
                        }
                    });
                }
            } catch (markerError) {
                console.error('Error creating marker:', markerError);
                // Final fallback
                marker = new google.maps.Marker({
                    position: { lat: follower.lat, lng: follower.lng },
                    map: followersMap,
                    title: `${follower.username} - ${follower.city}`
                });
            }
            
            // Create info window
            const infoWindow = createInfoWindow(follower);
            
            // Add click listener
            if (marker.addListener) {
                marker.addListener('click', () => {
                    closeAllInfoWindows();
                    infoWindow.open(followersMap, marker);
                });
            } else {
                // For AdvancedMarkerElement
                markerElement.addEventListener('click', () => {
                    closeAllInfoWindows();
                    infoWindow.open(followersMap, marker);
                });
            }
            
            followersMarkers.push({ 
                marker, 
                infoWindow, 
                data: follower,
                position: { lat: follower.lat, lng: follower.lng }
            });
            
        } catch (error) {
            console.error(`Error creating marker for ${follower.username}:`, error);
        }
    });
    
    console.log(`Created ${followersMarkers.length} followers markers`);
    console.log('Markers data:', followersMarkers.map(m => ({
        username: m.data.username,
        city: m.data.city,
        lat: m.data.lat,
        lng: m.data.lng
    })));
    
    // Fit map to show all markers
    fitMapToMarkers();
}

// Create custom marker element
function createCustomMarkerElement(follower) {
    const div = document.createElement('div');
    div.className = 'custom-marker';
    div.innerHTML = `<img src="${follower.avatarUrl}" alt="${follower.username}" onerror="this.src='/images/profile.jpg'">`;
    return div;
}

// Create info window
function createInfoWindow(follower) {
    // Clean city name for display (remove country if present)
    let cityName = follower.city;
    if (cityName && cityName.includes(',')) {
        cityName = cityName.split(',')[0].trim();
    }
    
    const content = `
        <div class="map-info-window">
            <img src="${follower.avatarUrl}" alt="${follower.username}" class="avatar" onerror="this.src='/images/profile.jpg'">
            <div class="username">${follower.username}</div>
            <div class="city">
                <i class="bi bi-geo-alt"></i>
                ${cityName}
            </div>
        </div>
    `;
    
    return new google.maps.InfoWindow({
        content: content,
        disableAutoPan: false
    });
}

// Close all open info windows
function closeAllInfoWindows() {
    followersMarkers.forEach(item => {
        if (item.infoWindow) {
            item.infoWindow.close();
        }
    });
}

// Clear all markers
function clearFollowersMarkers() {
    if (followersMarkers && Array.isArray(followersMarkers)) {
        followersMarkers.forEach(item => {
            if (item.marker) {
                if (item.marker.setMap) {
                    item.marker.setMap(null);
                } else if (item.marker.map) {
                    item.marker.map = null;
                }
            }
            if (item.infoWindow) {
                item.infoWindow.close();
            }
        });
    }
    
    if (markerClusterer) {
        try {
            if (typeof markerClusterer.clearMarkers === 'function') {
                markerClusterer.clearMarkers();
            } else if (typeof markerClusterer.setMap === 'function') {
                markerClusterer.setMap(null);
            }
        } catch (error) {
            console.log('Error clearing marker clusterer:', error);
        }
        markerClusterer = null;
    }
    
    followersMarkers = [];
}

// Add marker clustering
function addMarkerClustering() {
    if (followersMarkers && Array.isArray(followersMarkers) && followersMarkers.length > 0) {
        const markers = followersMarkers.map(item => item.marker).filter(marker => marker != null);
        if (markers.length > 0) {
            try {
                // Try to use the new MarkerClusterer API
                if (typeof MarkerClusterer !== 'undefined') {
                    markerClusterer = new MarkerClusterer({
                        map: followersMap,
                        markers: markers
                    });
                } else if (typeof google !== 'undefined' && google.maps && google.maps.MarkerClusterer) {
                    // Fallback to older API
                    markerClusterer = new google.maps.MarkerClusterer(followersMap, markers, {
                        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
                        gridSize: 60,
                        maxZoom: 15
                    });
                } else {
                    console.log('MarkerClusterer not available, skipping clustering');
                }
            } catch (error) {
                console.log('Error creating MarkerClusterer:', error);
            }
        }
    }
}

// Fit map to show all markers
function fitMapToMarkers() {
    if (!followersMarkers || !Array.isArray(followersMarkers) || followersMarkers.length === 0) {
        console.log('No markers to fit, using default Israel view');
        return;
    }
    
    console.log(`Fitting map to ${followersMarkers.length} markers`);
    
    const bounds = new google.maps.LatLngBounds();
    let validMarkers = 0;
    
    followersMarkers.forEach((item, index) => {
        if (item) {
            let position = null;
            
            // Use the saved position first, then try marker methods
            if (item.position) {
                position = item.position;
            } else if (item.data) {
                position = { lat: item.data.lat, lng: item.data.lng };
            } else if (item.marker && item.marker.position) {
                position = item.marker.position;
            } else if (item.marker && typeof item.marker.getPosition === 'function') {
                position = item.marker.getPosition();
            }
            
            if (position && typeof position.lat === 'number' && typeof position.lng === 'number') {
                console.log(`Adding marker ${index} (${item.data.username}) to bounds: ${position.lat}, ${position.lng}`);
                bounds.extend(position);
                validMarkers++;
            } else {
                console.log(`Marker ${index} (${item.data ? item.data.username : 'unknown'}) has no valid position:`, position);
            }
        }
    });
    
    if (validMarkers > 0 && followersMap && typeof followersMap.fitBounds === 'function') {
        console.log(`Fitting bounds for ${validMarkers} valid markers`);
        followersMap.fitBounds(bounds);
        
        // Add some padding and ensure we don't zoom in too much
        setTimeout(() => {
            const currentZoom = followersMap.getZoom();
            if (currentZoom > 10) {
                followersMap.setZoom(10); // Limit zoom for city-level view
            } else if (currentZoom < 6) {
                followersMap.setZoom(7); // Ensure we can see all of Israel
            }
        }, 100);
    } else {
        console.log('No valid markers found, keeping default view');
    }
}

// Update followers count display
function updateFollowersCount(count) {
    const countElement = document.getElementById('followersMapCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Start auto refresh
function startMapAutoRefresh() {
    // Clear existing interval
    if (followersRefreshInterval) {
        clearInterval(followersRefreshInterval);
    }
    
    // Refresh every 30 seconds
    followersRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing followers map...');
        refreshFollowersMap();
    }, 30000);
}

// Refresh followers map
function refreshFollowersMap() {
    console.log('Refreshing followers map...');
    loadFollowersMap();
}

// Show loading state
function showMapLoading() {
    document.getElementById('mapLoading').classList.remove('d-none');
    document.getElementById('mapError').classList.add('d-none');
    document.getElementById('followersMap').classList.add('d-none');
}

// Show error state
function showMapError() {
    document.getElementById('mapLoading').classList.add('d-none');
    document.getElementById('mapError').classList.remove('d-none');
    document.getElementById('followersMap').classList.add('d-none');
    
    // Update error message to be more helpful
    const errorContainer = document.getElementById('mapError');
    errorContainer.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center py-5">
            <i class="bi bi-wifi-off text-warning mb-3" style="font-size: 3rem;"></i>
            <h6 class="text-muted mb-3">שגיאה בטעינת המפה</h6>
            <p class="text-muted text-center mb-3">
                יש בעיה בחיבור לשרת או בטעינת נתוני המפה.<br>
                חיבור האינטרנט תקין - הבעיה היא בקוד המפה.
            </p>
            <div class="alert alert-warning text-start small mt-3" style="max-width: 400px;">
                <strong>למפתחים:</strong> בדקו את הקונסול לפרטי השגיאה
            </div>
            <button type="button" class="btn btn-primary" onclick="loadFollowersMap()">
                <i class="bi bi-arrow-clockwise me-2"></i>נסה שוב
            </button>
        </div>
    `;
}

// Show error state with Google Maps API message
function showMapErrorWithMessage() {
    document.getElementById('mapLoading').classList.add('d-none');
    document.getElementById('mapError').classList.remove('d-none');
    document.getElementById('followersMap').classList.add('d-none');
    
    // Update error message specifically for Google Maps API
    const errorContainer = document.getElementById('mapError');
    errorContainer.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center py-5">
            <i class="bi bi-key text-warning mb-3" style="font-size: 3rem;"></i>
            <h6 class="text-danger mb-3">יש צורך במפתח Google Maps API תקף</h6>
            <p class="text-muted text-center mb-3">
                כדי להציג את המפה, יש צורך במפתח Google Maps API פעיל.<br>
                <strong>למפתחי האפליקציה:</strong> אנא הוסיפו מפתח תקף בקובץ feed.html
            </p>
            <div class="alert alert-info text-start small mt-3" style="max-width: 400px;">
                <strong>הוראות למפתחים:</strong><br>
                1. קבלו מפתח מ-<a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a><br>
                2. החליפו את "AIzaSyDummy_Key_For_Testing" בקובץ feed.html<br>
                3. ודאו שה-Maps JavaScript API מופעל בפרויקט
            </div>
            <button type="button" class="btn btn-outline-primary" onclick="loadFollowersMap()">
                <i class="bi bi-arrow-clockwise me-2"></i>נסה שוב
            </button>
        </div>
    `;
}

// Show empty state (no followers)
function showMapEmpty() {
    document.getElementById('mapLoading').classList.add('d-none');
    document.getElementById('mapError').classList.add('d-none');
    document.getElementById('followersMap').classList.add('d-none');
    
    // Show empty message in error container
    const errorContainer = document.getElementById('mapError');
    errorContainer.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center py-5">
            <i class="bi bi-people text-muted mb-3" style="font-size: 3rem;"></i>
            <h6 class="text-muted mb-3">אין עוקבים להצגה</h6>
            <p class="text-muted text-center mb-3">התחל לעקוב אחרי אנשים כדי לראות אותם על המפה</p>
        </div>
    `;
    errorContainer.classList.remove('d-none');
}

// Show map content
function showMapContent() {
    document.getElementById('mapLoading').classList.add('d-none');
    document.getElementById('mapError').classList.add('d-none');
    document.getElementById('followersMap').classList.remove('d-none');
}

// Clean up when modal is closed
document.addEventListener('DOMContentLoaded', function() {
    const followersMapModal = document.getElementById('followersMapModal');
    if (followersMapModal) {
        followersMapModal.addEventListener('hidden.bs.modal', function() {
            console.log('Followers map modal closed, cleaning up...');
            
            // Clear auto refresh
            if (followersRefreshInterval) {
                clearInterval(followersRefreshInterval);
                followersRefreshInterval = null;
            }
            
            // Clear markers safely
            try {
                clearFollowersMarkers();
            } catch (error) {
                console.log('Error clearing markers on modal close:', error);
                // Force reset
                followersMarkers = [];
                markerClusterer = null;
            }
            
            // Reset map
            followersMap = null;
            followersMapData = [];
        });
    }
});

// FACEBOOK FUNCTIONALITY 

// Open Facebook page
function openFacebookPage() {
    try {
        // Get the Facebook page ID from the backend
        fetch('/api/facebook/page-info')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data && data.data.pageId) {
                    // Open Facebook page in new tab
                    const facebookUrl = `https://www.facebook.com/${data.data.pageId}`;
                    window.open(facebookUrl, '_blank');
                } else {
                    console.error('Failed to get Facebook page ID:', data.error);
                    // Show more specific error message
                    if (data.error && data.error.includes('not configured')) {
                        alert('עמוד הפייסבוק לא מוגדר במערכת.\nאנא צור קשר עם המנהל כדי להגדיר את עמוד הפייסבוק.');
                    } else {
                        alert('שגיאה בטעינת פרטי עמוד הפייסבוק:\n' + (data.error || 'שגיאה לא ידועה'));
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching Facebook page info:', error);
                // Fallback: show error message
                alert('שגיאה בחיבור לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.');
            });
    } catch (error) {
        console.error('Error in openFacebookPage:', error);
        alert('שגיאה בפתיחת עמוד הפייסבוק');
    }
}

//  NOTIFICATIONS FUNCTIONALITY 

// Open notifications modal
function openNotificationsModal() {
    const modalElement = document.getElementById('notificationsModal');
    
    if (!modalElement) {
        console.error('Notifications modal not found!');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Add a small delay to ensure modal is fully shown before loading
        setTimeout(() => {
            loadNotifications();
        }, 100);
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}

// Load notifications from the server
async function loadNotifications() {
    try {
        const token = getToken();
        
        if (!token) {
            showNotificationError('יש להתחבר כדי לראות התראות');
            return;
        }

        const response = await fetch('/api/notifications/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            userNotifications = result.data || [];
            try {
                displayNotifications();
            } catch (displayError) {
                console.error('Error displaying notifications:', displayError);
                showNotificationError('שגיאה בהצגת ההתראות: ' + displayError.message);
            }
        } else {
            const errorText = await response.text();
            console.error('Failed to load notifications:', response.status, errorText);
            showNotificationError(`שגיאה בטעינת ההתראות (${response.status})`);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        showNotificationError('שגיאה בטעינת ההתראות: ' + error.message);
    }
}

// Display notifications in the modal
function displayNotifications() {
    const container = document.getElementById('notificationsContainer');
    
    if (!userNotifications || userNotifications.length === 0) {
        container.innerHTML = `
            <div class="notification-empty-state">
                <i class="bi bi-bell-slash"></i>
                <p>אין התראות חדשות</p>
            </div>
        `;
        return;
    }

    const notificationsHTML = userNotifications.map(notification => {
        // Skip notifications with missing sender data
        if (!notification.sender) {
            console.warn('Notification with missing sender data:', notification);
            return '';
        }

        const timeAgo = getTimeAgo(notification.createdAt);
        const isUnread = !notification.isRead;
        
        let notificationText = '';
        let postPreview = '';
        let actions = '';

        switch (notification.type) {
            case 'follow':
                notificationText = 'התחיל לעקוב אחריך';
                actions = '';
                break;
            case 'like':
                notificationText = 'אהב את הפוסט שלך';
                if (notification.post) {
                    const postImage = notification.post.mediaUrl || 'images/profile.jpg';
                    postPreview = `
                        <a href="#" onclick="viewPost('${notification.post._id}')" class="post-image-link">
                            <div class="notification-post-image">
                                <img src="${toAbs(postImage)}" alt="Post" onerror="this.src='images/profile.jpg'" />
                            </div>
                        </a>
                    `;
                }
                actions = '';
                break;
            case 'comment':
                notificationText = 'הגיב על הפוסט שלך';
                if (notification.post) {
                    const postImage = notification.post.mediaUrl || 'images/profile.jpg';
                    postPreview = `
                        <a href="#" onclick="viewPost('${notification.post._id}')" class="post-image-link">
                            <div class="notification-post-image">
                                <img src="${toAbs(postImage)}" alt="Post" onerror="this.src='images/profile.jpg'" />
                            </div>
                        </a>
                    `;
                }
                actions = '';
                break;
        }

        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${notification._id}">
                <div class="notification-left-section">
                    <a href="#" onclick="viewUserProfile('${notification.sender._id}')" class="avatar-link">
                        <img src="${toAbs(notification.sender.avatarUrl)}" alt="${notification.sender.username}" class="notification-avatar">
                    </a>
                    <div class="notification-content">
                        <div class="notification-header">
                            <h6 class="notification-username">
                                <a href="#" class="username-link" data-user-id="${notification.sender._id}">
                                    ${notification.sender.username}
                                </a>
                            </h6>
                        </div>
                        <p class="notification-text">${notificationText}</p>
                        <span class="notification-time">${timeAgo}</span>
                        ${actions}
                    </div>
                </div>
                ${postPreview}
            </div>
        `;
    }).filter(html => html !== '').join('');

    container.innerHTML = notificationsHTML;

    // Add click handlers for marking notifications as read
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            const notificationId = this.dataset.notificationId;
            markNotificationAsRead(notificationId);
        });
    });

    // Add click handlers for username links
    container.querySelectorAll('.username-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const userId = this.dataset.userId;
            console.log('Username link clicked for user:', userId);
            viewUserProfile(userId);
        });
    });
}

// Mark a single notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
                    // Update local state
        const notification = userNotifications.find(n => n._id === notificationId);
        if (notification) {
            notification.isRead = true;
            document.querySelector(`[data-notification-id="${notificationId}"]`).classList.remove('unread');
        }
        updateUnreadCount();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch('/api/notifications/read-all', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
                    // Update local state
        userNotifications.forEach(notification => {
            notification.isRead = true;
        });
        
        // Update UI
        document.querySelectorAll('.notification-item').forEach(item => {
            item.classList.remove('unread');
        });
        
        updateUnreadCount();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

// Update unread count and badge
function updateUnreadCount() {
    notificationUnreadCount = userNotifications.filter(n => !n.isRead).length;
    const badge = document.getElementById('notificationBadge');
    
    if (notificationUnreadCount > 0) {
        badge.textContent = notificationUnreadCount;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

// Load unread count on page load
async function loadUnreadCount() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch('/api/notifications/unread-count', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            notificationUnreadCount = result.data.count || 0;
            updateUnreadCount();
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

// Show notification error
function showNotificationError(message) {
    const container = document.getElementById('notificationsContainer');
    container.innerHTML = `
        <div class="notification-empty-state">
            <i class="bi bi-exclamation-triangle-fill text-danger"></i>
            <p>${message}</p>
        </div>
    `;
}

// Utility function to get time ago
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'עכשיו';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `לפני ${minutes} דקות`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `לפני ${hours} שעות`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `לפני ${days} ימים`;
    } else {
        const months = Math.floor(diffInSeconds / 2592000);
        return `לפני ${months} חודשים`;
    }
}



// View user profile function
async function viewUserProfile(userId) {
    console.log('Viewing user profile:', userId);
    
    // Clear cached like states to prevent showing likes from other users
    clearCachedLikeStates();
    
    try {
        // Check if this is the current user's own profile
        if (window.currentUser && (window.currentUser.userId === userId || window.currentUser.id === userId)) {
            console.log('👤 This is the current user, using cached data');
            
            // Show loading state
            const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
            modal.show();
            
            // Get current user's posts from the feed data
            const currentUserPosts = window.currentPosts ? 
                window.currentPosts.filter(post => {
                    const postAuthorId = post.author?._id || post.author;
                    const currentUserId = window.currentUser.userId || window.currentUser.id;
                    const matches = postAuthorId === currentUserId;
                    console.log(`Current user post check:`, {
                        postId: post._id,
                        postAuthorId: postAuthorId,
                        currentUserId: currentUserId,
                        matches: matches
                    });
                    return matches;
                }) : [];
            
            console.log('Current user posts found:', currentUserPosts.length);
            
            const userData = {
                _id: window.currentUser.userId || window.currentUser.id,
                username: window.currentUser.username,
                avatarUrl: window.currentUser.avatarUrl,
                bio: window.currentUser.bio,
                followers: window.currentUser.followers || [],
                following: window.currentUser.following || [],
                posts: currentUserPosts,
                postCount: currentUserPosts.length,
                isFollowing: false // Can't follow yourself
            };
            
            displayUserProfile(userData);
            return;
        }
        
        // Show loading state
        const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();
        
        // Fetch user data with posts using the new endpoint
        const token = getToken();
        if (!token) {
            showUserProfileError('יש להתחבר כדי לראות פרופילים');
            return;
        }
        
        console.log('Fetching user profile with posts for user:', userId);
        
        const response = await fetch(`/api/users/${userId}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                const userData = result.data;
                console.log('User profile data received:', {
                    username: userData.username,
                    postCount: userData.postCount,
                    postsLength: userData.posts ? userData.posts.length : 0,
                    followersCount: userData.followersCount,
                    followingCount: userData.followingCount
                });
                displayUserProfile(userData);
            } else {
                console.error('Invalid response format:', result);
                showUserProfileError('שגיאה בפורמט התגובה');
            }
        } else {
            console.error('Failed to fetch user profile:', response.status, response.statusText);
            showUserProfileError('שגיאה בטעינת הפרופיל');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showUserProfileError('שגיאה בטעינת הפרופיל');
    }
}



// Display user profile in modal
function displayUserProfile(userData) {
    const container = document.getElementById('userProfileContent');
    
    // Check if current user is following this user
    const isFollowing = userData.isFollowing || false;
    
    // Check if this is the current user's own profile
    const isOwnProfile = userData.isOwnProfile || (window.currentUser && window.currentUser.userId === userData._id);
    
    container.innerHTML = `
        <img src="${toAbs(userData.avatarUrl)}" alt="${userData.username}" class="user-profile-avatar" onerror="this.src='images/profile.jpg'">
        <h4 class="user-profile-username">${userData.username}</h4>
        ${userData.bio ? `<p class="user-profile-bio">${userData.bio}</p>` : ''}
        
        <div class="user-profile-stats">
            <div class="user-profile-stat">
                <span class="user-profile-stat-number">${userData.postCount || 0}</span>
                <span class="user-profile-stat-label">פוסטים</span>
            </div>
            <div class="user-profile-stat">
                <span class="user-profile-stat-number">${userData.followersCount || 0}</span>
                <span class="user-profile-stat-label">עוקבים</span>
            </div>
            <div class="user-profile-stat">
                <span class="user-profile-stat-number">${userData.followingCount || 0}</span>
                <span class="user-profile-stat-label">במעקב</span>
            </div>
        </div>
        

        
        ${userData.posts && userData.posts.length > 0 ? `
            <div class="user-profile-posts">
                <h6 class="posts-section-title">פוסטים</h6>
                <div class="posts-grid">
                    ${userData.posts.map(post => `
                        <div class="post-thumbnail" onclick="viewPost('${post._id}')">
                            <img src="${toAbs(post.mediaUrl)}" alt="Post" onerror="this.src='images/profile.jpg'">
                            ${post.mediaType === 'video' ? '<div class="video-indicator"><i class="bi bi-play-fill"></i></div>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="user-profile-posts">
                <h6 class="posts-section-title">פוסטים</h6>
                <div class="no-posts-message">
                    <i class="bi bi-image"></i>
                    <p>אין פוסטים עדיין</p>
                </div>
            </div>
        `}
    `;
}

// Show user profile error
function showUserProfileError(message) {
    const container = document.getElementById('userProfileContent');
    container.innerHTML = `
        <div class="text-center text-danger py-4">
            <i class="bi bi-exclamation-triangle-fill" style="font-size: 2rem;"></i>
            <p class="mt-2">${message}</p>
        </div>
    `;
}

// Toggle follow/unfollow
async function toggleFollow(userId, isCurrentlyFollowing) {
    try {
        const token = getToken();
        if (!token) return;
        
        const endpoint = isCurrentlyFollowing ? 'unfollow' : 'follow';
        const response = await fetch(`/api/users/${userId}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Refresh the profile display
            viewUserProfile(userId);
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
    }
}

// Send message (placeholder)
function sendMessage(userId) {
    console.log('Send message to user:', userId);
    // TODO: Implement messaging functionality
    alert('פונקציונליות ההודעות תתווסף בקרוב');
}

// View post (placeholder function)
function viewPost(postId) {
    console.log('Viewing post:', postId);
    // TODO: Implement post view
    // This could scroll to the post in the feed or open a post modal
}

// Load notifications when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load unread count after a short delay to ensure user is authenticated
    setTimeout(() => {
        const token = getToken();
        
        if (token) {
            loadUnreadCount();
        }
    }, 1000);
});

// Refresh notifications periodically
setInterval(() => {
    if (getToken() && document.getElementById('notificationsModal').classList.contains('show')) {
        loadNotifications();
    }
}, 30000); // Refresh every 30 seconds when modal is open


