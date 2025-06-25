# Unread Messages Feature - Industry Standard Implementation

## Problem Analysis

The previous implementation used unreliable "page-leave" tracking that was inconsistent across browsers and scenarios. The main issues were:

1. **Unreliable browser events**: `beforeunload`, `pagehide`, `visibilitychange` events are not consistently supported
2. **Race conditions**: Multiple components trying to mark the same group as visited simultaneously
3. **Complex navigation tracking**: URL observers and event listeners were fragile and hard to maintain
4. **Not real-time**: Unread counts only updated on page refresh or manual polling

## Solution Implemented - Industry Standard Approach

### 1. **Immediate Mark-as-Read on Group Entry**
- When a user navigates to any group view (`GroupView`, `ChatView`, `GroupResultsView`), immediately call `markGroupAsVisited(groupId)`
- This sets the `last_visited_at` timestamp to "now" and resets unread count to 0
- No more unreliable page-leave tracking

### 2. **Real-Time Message Tracking**
- Supabase real-time subscription listens for new `chat_messages` INSERT events
- When a new message arrives, check if the user is currently viewing that group
- If user is NOT viewing the group → increment unread count
- If user IS viewing the group → don't increment (they're actively reading)

### 3. **Current Group Tracking**
- `setCurrentGroup(groupId)` tracks which group the user is currently viewing
- This prevents unread counts from incrementing while the user is actively in the group
- Automatically resets when user navigates away

## Implementation Details

### Key Changes Made

**Files Modified:**
- `src/hooks/useUnreadCount.ts` - Complete rewrite with real-time tracking
- `src/components/group/GroupView.tsx` - Immediate mark-as-read on entry
- `src/components/chat/ChatView.tsx` - Immediate mark-as-read on entry  
- `src/components/group/GroupResultsView.tsx` - Immediate mark-as-read on entry

**Removed:**
- All page-leave event listeners (`beforeunload`, `pagehide`, `visibilitychange`)
- URL tracking and navigation observers
- Supabase Edge Function (no longer needed)
- Complex debouncing and race condition handling

### How It Works

1. **User enters group** → `markGroupAsVisited()` called immediately → unread count = 0
2. **New message arrives** → Real-time event fires → if user not in that group, increment count
3. **User leaves group** → No action needed (already marked as read when they entered)
4. **User returns to group** → `markGroupAsVisited()` called again → unread count = 0

## Benefits

- **Reliable**: No dependency on unreliable browser events
- **Real-time**: Unread counts update immediately when new messages arrive
- **Accurate**: Count only goes up when user is actually not viewing the group
- **Standard**: This is how Slack, Discord, WhatsApp, etc. handle unread counts
- **Simple**: Much cleaner code without complex event listeners
- **Performance**: No polling or complex URL tracking

## Testing

### Test Scenarios

1. **Enter a group with unread messages**
   - Navigate to a group that has unread messages
   - Verify the unread badge immediately resets to 0

2. **Receive new message while in group**
   - Stay in a group
   - Have someone else send a message
   - Verify unread count stays at 0 (you're actively viewing)

3. **Receive new message while not in group**
   - Navigate away from a group
   - Have someone else send a message
   - Verify unread count increments to 1

4. **Navigate between groups**
   - Enter group A → count resets to 0
   - Navigate to group B → group A count increments if new messages arrive
   - Return to group A → count resets to 0 again

### Console Logs to Watch For

- `GroupView: Entering group 123, marking as read`
- `ChatView: Entering chat for group 123, marking as read`
- `GroupResultsView: Entering results for group 123, marking as read`
- `Real-time message received for group 123, current group: 456`
- `Incrementing unread count for group 123 (user not viewing)`
- `Not incrementing unread count for group 123 (user is viewing)`

## Deployment

No special deployment steps needed! The changes are all frontend-based and will work immediately when deployed.

## Expected Behavior

- **Immediate reset**: Unread counts reset to 0 as soon as you enter a group
- **Real-time updates**: New messages increment counts only when you're not viewing that group
- **Accurate tracking**: Counts reflect actual unread messages, not just time-based tracking
- **Cross-browser**: Works consistently across all browsers and devices 