# 🎯 Ticket Management System - Quick Reference Guide

**Status**: ✅ COMPLETE | **Date**: March 10, 2026 | **Version**: 1.0.0

---

## 🚀 Quick Start

### Access the Tickets System

**Frontend**: Navigate to menu → Tickets (or visit `/tickets`)

**Backend API**: `GET /api/tickets`

### Create a Ticket

**Via UI**:
1. Click "New Ticket" button
2. Fill in Title, Description, Priority
3. Optionally select Device and assign to User
4. Click "Create Ticket"

**Via API**:
```bash
POST /api/tickets
{
  "title": "Network Issue",
  "description": "Cannot connect to VPN",
  "priority": "high",
  "device_id": "uuid-optional",
  "assigned_to": "user-uuid-optional"
}
```

### View Tickets

- **List View**: Displays all tickets in your company
- **Filter**: By Status, Priority
- **Search**: In Title, Description, or Ticket #
- **Pagination**: 20 items per page

### Manage Tickets

- **Update Status**: Change from dropdown in Details modal
- **Add Comment**: Type and press Enter or click Comment button
- **View History**: Scroll through "Change History" section
- **Delete**: Click delete icon (⚠️ irreversible)

---

## 📊 Dashboard

The Tickets page includes 4 statistics cards:

| Card | Shows | Updates |
|------|-------|---------|
| **Total Tickets** | All tickets in company | Automatic |
| **Open** | Tickets with status = open | Automatic |
| **In Progress** | Tickets with status = in_progress | Automatic |
| **High Priority** | Open high priority tickets | Automatic |

Stats update every 30 seconds automatically.

---

## 🔑 API Endpoints

### List Tickets
```
GET /api/tickets?page=1&limit=20&status=open&priority=high&search=network

Response:
{
  "success": true,
  "data": [ { ticket object }, ... ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Get Single Ticket
```
GET /api/tickets/{id}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticket_number": "TKT-company-1",
    "title": "...",
    "status": "open",
    "priority": "high",
    "Comments": [ ... ],
    "History": [ ... ]
  }
}
```

### Create Ticket
```
POST /api/tickets
{
  "title": "Required",
  "description": "Required",
  "priority": "high|medium|low",
  "device_id": "optional",
  "assigned_to": "optional"
}
```

### Update Ticket
```
PUT /api/tickets/{id}
{
  "title": "New Title",
  "status": "in_progress",
  "priority": "medium",
  "assigned_to": "new-user-uuid"
}

Note: Only changed fields are recorded in history
```

### Delete Ticket
```
DELETE /api/tickets/{id}

Note: Cascades to comments and history
```

### Add Comment
```
POST /api/tickets/{id}/comments
{
  "comment_text": "Comment content"
}
```

### Delete Comment
```
DELETE /api/tickets/{id}/comments/{commentId}
```

### Get Statistics
```
GET /api/tickets/stats

Response:
{
  "success": true,
  "data": {
    "totalTickets": 125,
    "openTickets": 45,
    "closedTickets": 70,
    "inProgressTickets": 10,
    "highPriorityTickets": 8
  }
}
```

---

## 🎨 UI Features

### Status Badges
- 🔵 **Open** - New or unstarted tickets
- 🟡 **In Progress** - Being worked on
- 🟢 **Closed** - Resolved tickets

### Priority Colors
- 🔴 **High** - Red background
- 🟠 **Medium** - Yellow background
- 🟢 **Low** - Green background

### Dark Mode
- Toggle: Ctrl/Cmd + D
- Applies to entire Tickets page
- Persistent setting in localStorage

### Keyboard Shortcuts
- **Enter** - Submit comment (in details modal)
- **Ctrl/Cmd + K** - Open global search
- **Ctrl/Cmd + D** - Toggle dark mode

---

## 🔒 Permissions

All features require:
- ✅ Valid JWT token
- ✅ Belong to same company as ticket
- ✅ Authentication (no public access)

Permission scopes:
- **View**: All authenticated users
- **Create**: All authenticated users
- **Update**: All authenticated users
- **Delete**: All authenticated users (with warning)
- **Comment**: All authenticated users
- **History**: Visible to all

---

## 💾 Database Tables

### tickets
```
id, ticket_number, title, description, priority, status,
company_id, device_id, created_by, assigned_to,
resolution_notes, created_at, updated_at
```

### ticket_comments
```
id, ticket_id, comment_text, created_by, created_at, updated_at
```

### ticket_histories
```
id, ticket_id, field_changed, old_value, new_value,
changed_by, changed_at, created_at, updated_at
```

---

## 🔧 Configuration

### Cache Settings
- Tickets list: 120 seconds (2 minutes)
- Statistics: 300 seconds (5 minutes)
- Clear when: Create, Update, or Delete

### Auto-Refresh UI
- Interval: 30 seconds
- Refreshes: Tickets list and statistics
- No page reload required

### Pagination
- Default limit: 20 items
- Max limit: 100 items
- Min limit: 1 item

### Ticket Numbering
- Format: `TKT-{company_id}-{sequence}`
- Examples: TKT-12345-1, TKT-12345-2
- Auto-incremented per company

---

## 🐛 Troubleshooting

### Issue: Tickets not loading

**Solution**:
1. Check authentication token is valid
2. Open browser console (F12) for errors
3. Click "Refresh" button in UI
4. Check network tab for failed requests

### Issue: Comment not saving

**Solution**:
1. Ensure comment text is not empty
2. Check network connection
3. Verify you're assigned to ticket's company
4. Reload ticket details

### Issue: Status not updating

**Solution**:
1. Select new status from dropdown
2. Wait for success toast notification
3. Check if you have permission
4. Try refreshing the page

### Issue: Dark mode not working

**Solution**:
1. Press Ctrl/Cmd + D
2. Check if localStorage is enabled
3. Clear browser cache
4. Reload page

---

## 📱 Mobile Support

The Tickets system is fully responsive:
- ✅ Optimized for mobile screens
- ✅ Touch-friendly buttons
- ✅ Responsive tables
- ✅ Modal dialogs on mobile
- ✅ Dark mode on mobile

### Mobile Tips
- Use landscape mode for wider tables
- Tap ticket row to view details
- Swipe modals to close (browser dependent)
- Use native keyboard for faster typing

---

## 🔐 Security Notes

### Data Protection
- All data encrypted in transit (HTTPS)
- Authentication required for all operations
- Company isolation enforced in queries
- User actions logged in history

### Best Practices
- Never share JWT tokens
- Logout when finished
- Use strong passwords
- Clear browser history after use
- Report suspicious activity

---

## 📈 Performance Tips

### For Better Performance
1. Use specific filters to reduce results
2. Use pagination limit of 20-50 items
3. Close unused modals
4. Clear browser cache periodically
5. Close completed tickets (archive them)

### Monitor Performance
- Check browser console for errors
- Monitor network requests (F12 → Network)
- Check page load times
- Report slow responses to support

---

## 🚀 Advanced Features

### Search Operators
- Search works on: title, description, ticket_number
- Case-insensitive matching
- Partial word matching
- Multiple word search AND logic

### Filter Combinations
- Filters can be combined
- Status + Priority + Search
- Filters reset pagination to page 1
- "All" option clears that filter

### Change Tracking
- Every field change is recorded
- Shows old and new values
- Records user who made change
- Includes timestamp
- Sortable chronologically

---

## 📞 Support Resources

### Documentation
- [Full Implementation Guide](TICKET_SYSTEM_IMPLEMENTATION.md)
- [Project Status](PROJECT_STATUS_SUMMARY.md)
- [Feature Tracking](FEATURE_TRACKING.md)

### Common Questions
**Q: Can I restore a deleted ticket?**
A: No, deletions are permanent. Archive instead.

**Q: Can I see who viewed my ticket?**
A: No, only changes are recorded in history.

**Q: Can I assign a ticket to multiple users?**
A: No, only single assignee currently supported.

**Q: How long is history kept?**
A: Permanently (unless ticket is deleted).

**Q: Can I export tickets?**
A: Yes, via Reports section with CSV export.

---

## 🎓 Best Practices

### Creating Tickets
✅ Use clear, descriptive titles
✅ Provide detailed descriptions
✅ Set appropriate priority
✅ Assign to responsible person
✅ Associate with related device

### Managing Tickets
✅ Update status as work progresses
✅ Add comments for collaboration
✅ Close tickets when resolved
✅ Review change history regularly
✅ Archive old tickets

### Team Collaboration
✅ @mention team members in comments
✅ Use status to indicate progress
✅ Set priority correctly
✅ Assign clear ownership
✅ Regular status updates

---

## ⚡ One-Minute Features

| Feature | How to Use | Time Save |
|---------|-----------|-----------|
| **Quick Create** | New Ticket button → Fill form | 30 seconds |
| **Quick Search** | Type in search box | 5 seconds |
| **Quick Filter** | Select filter dropdown | 2 seconds |
| **Quick View** | Click eye icon | 3 seconds |
| **Quick Comment** | Type + Press Enter | 5 seconds |
| **Quick Status** | Select from dropdown | 2 seconds |

---

## 🎯 Common Workflows

### New Issue Workflow
1. Click "New Ticket"
2. Enter title and description
3. Set priority and device
4. Assign to team member
5. Click "Create Ticket"

### Update Status Workflow
1. Find ticket in list
2. Click eye icon
3. Select new status
4. Modal closes with notification

### Add Comment Workflow
1. Open ticket details
2. Scroll to Comments section
3. Type comment
4. Press Enter (keyboard) or click "Comment"
5. Comment appears instantly

### Change Priority Workflow
1. Open ticket details
2. Click status dropdown
3. Note: Direct priority edit in modal pending
4. Use API for direct update

---

## 📋 Integration Examples

### With Alerts System
- Create ticket from alert
- Link alert to existing ticket
- Track resolution in ticket

### With Devices Page
- Create ticket from device view
- Pre-populate device in ticket
- View device tickets from details

### With Reports
- Export ticket data to CSV
- Generate ticket statistics
- Track ticket trends

---

**Version**: 1.0.0  
**Last Updated**: March 10, 2026  
**Maintained By**: Aaditech Solution

---

For complete API documentation, see [TICKET_SYSTEM_IMPLEMENTATION.md](TICKET_SYSTEM_IMPLEMENTATION.md)
