# ExoClick Interstitial Ad Integration

## Overview

This document describes the implementation of ExoClick interstitial ads in The Daily Ditto web app. The ads are displayed immediately after a user submits a vote, before showing the global results.

## Implementation Details

### 1. HTML Integration (`index.html`)

The ExoClick ad code is integrated in the HTML file as per ExoClick's requirements:

```html
<!-- ExoClick Interstitial Ad -->
<script async type="application/javascript" src="https://a.pemsrv.com/ad-provider.js"></script>
<ins class="eas6a97888e35" data-zoneid="5678778"></ins>
<script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>

<!-- ExoClick Event Listener for ad display -->
<script type="application/javascript">
  document.addEventListener('creativeDisplayed-5678778', function() {
    console.log('ExoClick interstitial ad displayed');
    // Notify React app that ad has been displayed
    window.dispatchEvent(new CustomEvent('exoclickAdDisplayed'));
  }, false);
</script>
```

### 2. React Hook (`src/hooks/useExoClickAd.ts`)

A custom React hook manages the ad functionality:

- **Preloading**: Ads are preloaded when the voting page loads
- **Display**: Ads are shown after vote submission
- **Session Management**: Ads are only shown once per session
- **Error Handling**: Graceful fallback if ads fail to load
- **Development Mode**: Ads are skipped in development environment

### 3. Integration Points

#### QuestionOfDay Component (`src/components/poll/QuestionOfDay.tsx`)
- Preloads the ad when the component mounts
- Ensures the ad is ready when the user submits their vote

#### Dashboard Component (`src/pages/Dashboard.tsx`)
- Shows the ad in the `handleVoteSubmit` function
- Displays the ad before showing results
- Continues to results even if the ad fails

## User Experience

1. User sees the voting question
2. Ad is preloaded in the background
3. User submits their vote
4. Interstitial ad is displayed (if not already shown in session)
5. After ad closes, global results are shown

## Safety Features

- **Development Mode**: Ads are automatically skipped in development
- **Session Limiting**: Ads are only shown once per session
- **Timeout Protection**: 10-second timeout prevents app from hanging
- **Error Recovery**: App continues normally if ads fail
- **SSR Safe**: Checks for browser environment before running

## Configuration

### Zone ID
The current zone ID is `5678778`. To change this:
1. Update the `data-zoneid` attribute in `index.html`
2. Update the zone ID in the event listener
3. Update the zone ID in `useExoClickAd.ts`

### Ad Display Frequency
Currently set to show once per session. To modify:
- Edit the `hasAdBeenShown` logic in `useExoClickAd.ts`
- Consider implementing time-based or action-based frequency limits

## Testing

### Development Testing
- Ads are automatically skipped in development mode
- Check console logs for ad-related messages
- Test the flow without ads interfering

### Production Testing
- Deploy to production environment
- Verify ads load and display correctly
- Test error scenarios (network issues, ad blocking, etc.)

## Troubleshooting

### Common Issues

1. **Ad not displaying**
   - Check browser console for errors
   - Verify zone ID is correct
   - Ensure ExoClick script is loading

2. **App hanging after vote**
   - Check for timeout issues
   - Verify event listener is working
   - Check for JavaScript errors

3. **Multiple ads showing**
   - Verify session management is working
   - Check for multiple component instances

### Debug Mode
Add `console.log` statements in `useExoClickAd.ts` to debug:
- Ad preloading status
- Ad display attempts
- Event listener registration
- Timeout handling

## Maintenance

### Regular Tasks
- Monitor ad performance and revenue
- Check for ExoClick script updates
- Test ad display flow periodically
- Review user feedback about ad experience

### Updates
- Keep ExoClick script URL current
- Update zone IDs as needed
- Modify display frequency based on user feedback
- Adjust timeout values if needed

## Privacy and Compliance

- Ads are only shown after user action (vote submission)
- No personal data is shared with ExoClick
- Ad display is transparent to users
- Session-based limiting prevents excessive ad exposure 