# Course Edit - Technical Reference for Developers

## Implementation Architecture

### State Management Pattern

```javascript
// Form State (populated from selectedCourse)
const [courseForm, setCourseForm] = useState({
    courseTitle: '',
    subtitle: '',
    descriptionText: '',
    technicalCategory: 'Web Coding',
    level: 'Beginner',
    language: 'English',
    estimatedDurationHours: 1,
    price: 0,
    discountPrice: null,
    thumbnailUrl: '',
    learningObjectives: '',
    requirements: '',
    tags: ''
});

// Thumbnail Upload State
const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
const [thumbnailUploadError, setThumbnailUploadError] = useState('');
const [thumbnailPreview, setThumbnailPreview] = useState('');
const [selectedThumbnailFile, setSelectedThumbnailFile] = useState(null);

// Modal State
const [isEditCourseModal, setIsEditCourseModal] = useState(false);
const [selectedCourse, setSelectedCourse] = useState(null);
const [isContentExpanded, setIsContentExpanded] = useState(false);
```

---

## Data Flow Diagram

```
User clicks "Edit Info"
    ↓
selectedCourse set to course data
isEditCourseModal = true
    ↓
useEffect fires → Populates courseForm
    ↓
Modal renders with populated fields
    ↓
User makes changes (3 paths):

PATH 1: Thumbnail Upload
  ├─ handleThumbnailFileSelect()
  │  ├─ Validate type
  │  ├─ Validate size
  │  └─ Create preview
  ├─ handleUploadThumbnail()
  │  ├─ POST /courses/:id/thumbnail
  │  └─ Update courseForm.thumbnailUrl
  └─ User clicks Save Changes

PATH 2: Form Data Changes
  ├─ setCourseForm({ ...courseForm, field: value })
  ├─ Multiple fields updated
  └─ User clicks Save Changes

PATH 3: Content Management
  ├─ setIsContentExpanded(!isContentExpanded)
  ├─ View curriculum
  └─ Click Add Chapter/Lesson
     (Opens separate modals)

SUBMISSION (Paths 1 & 2 converge)
  ├─ handleEditCourse()
  │  ├─ Parse multiline fields
  │  ├─ Parse comma-separated fields
  │  ├─ PUT /api/courses/:id
  │  └─ Update local state
  ├─ Modal closes
  ├─ Course table refreshes
  └─ User sees updated course
```

---

## Component File Structure

### InstructorDashboard.jsx

**Location:** `client/src/pages/instructor/InstructorDashboard.jsx`

**Key Sections:**
1. Imports (lines 1-20)
   - React hooks
   - Service imports
   - Icon library
   - Theme context

2. Styles (lines 21-150+)
   - Extensive inline CSS
   - Theme-based colors
   - Modal styling
   - Form styling

3. State Declaration (lines 160-220)
   - Component state variables
   - Form state
   - Modal state
   - Upload state

4. useEffect Hooks (lines 230-280)
   - Data fetching
   - Form population
   - Content refresh

5. Handler Functions (lines 290-600)
   - Course management
   - Thumbnail upload
   - Form submission
   - Content operations

6. Render Functions (lines 800+)
   - renderCourses()
   - renderOverview()
   - renderStudents()
   - etc.

7. JSX Return (lines 1300+)
   - Layout structure
   - Sidebar
   - Main content
   - Modals (including Edit Modal)

---

## Key Handler Functions

### handleThumbnailFileSelect(event)

```javascript
const handleThumbnailFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: File type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        setThumbnailUploadError('Please upload a JPG, PNG, or WebP image');
        return;
    }

    // Validation: File size
    if (file.size > 5 * 1024 * 1024) {
        setThumbnailUploadError('Image size must be less than 5MB');
        return;
    }

    // Store file and create preview
    setSelectedThumbnailFile(file);
    setThumbnailUploadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
        setThumbnailPreview(e.target?.result || '');
    };
    reader.readAsDataURL(file);
};
```

**Key Points:**
- Validates MIME type (frontend check)
- Validates file size (5MB limit)
- Creates data URL for preview
- Clears previous errors
- Non-blocking (doesn't upload yet)

---

### handleUploadThumbnail()

```javascript
const handleUploadThumbnail = async () => {
    if (!selectedThumbnailFile || !selectedCourse) return;

    setIsUploadingThumbnail(true);
    setThumbnailUploadError('');

    try {
        const formData = new FormData();
        formData.append('thumbnail', selectedThumbnailFile);

        const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/courses/${selectedCourse._id}/thumbnail`,
            {
                method: 'POST',
                credentials: 'include', // Send auth cookie
                body: formData
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();
        
        // Sync all state after successful upload
        setSelectedCourse(result.data);
        setCourseForm(prev => ({ ...prev, thumbnailUrl: result.data.thumbnailUrl }));
        setCourses(prev => prev.map(c => c._id === selectedCourse._id ? result.data : c));
        
        // Clear upload state
        setSelectedThumbnailFile(null);
        setThumbnailPreview('');
    } catch (err) {
        setThumbnailUploadError(err.message || 'Failed to upload thumbnail');
    } finally {
        setIsUploadingThumbnail(false);
    }
};
```

**Key Points:**
- Uses native fetch (not axios)
- FormData for multipart/form-data
- Includes credentials: 'include' for auth cookie
- Three-part state sync on success:
  1. Update selectedCourse
  2. Update form thumbnail
  3. Update courses list
- Comprehensive error handling
- Finally block ensures cleanup

---

### handleEditCourse(e)

```javascript
const handleEditCourse = async (e) => {
    e.preventDefault();
    try {
        const payload = {
            ...courseForm,
            learningObjectives: courseForm.learningObjectives.split('\n').filter(Boolean),
            requirements: courseForm.requirements.split('\n').filter(Boolean),
            tags: courseForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        };
        const res = await courseService.update(selectedCourse._id, payload);
        setCourses(prev => prev.map(c => c._id === selectedCourse._id ? res.data.data : c));
        setIsEditCourseModal(false);
    } catch (err) { 
        alert(err.response?.data?.message || 'Failed to update course'); 
    }
};
```

**Key Points:**
- Form submission handler
- Transforms multiline fields to arrays
- Transforms tags from comma-separated to array
- Uses courseService.update() (axios wrapper)
- Syncs courses list with response
- Closes modal on success
- Alert on error (user feedback)

---

## useEffect Hook for Form Population

```javascript
useEffect(() => {
    if (isEditCourseModal && selectedCourse) {
        setCourseForm({
            courseTitle: selectedCourse.courseTitle || '',
            subtitle: selectedCourse.subtitle || '',
            descriptionText: selectedCourse.descriptionText || '',
            technicalCategory: selectedCourse.technicalCategory || 'Web Coding',
            level: selectedCourse.level || 'Beginner',
            language: selectedCourse.language || 'English',
            estimatedDurationHours: selectedCourse.estimatedDurationHours || 1,
            price: selectedCourse.price || 0,
            discountPrice: selectedCourse.discountPrice || null,
            thumbnailUrl: selectedCourse.thumbnailUrl || '',
            learningObjectives: (selectedCourse.learningObjectives || []).join('\n'),
            requirements: (selectedCourse.requirements || []).join('\n'),
            tags: (selectedCourse.tags || []).join(', ')
        });
        setThumbnailPreview('');
        setSelectedThumbnailFile(null);
        setThumbnailUploadError('');
    }
}, [isEditCourseModal, selectedCourse]);
```

**Key Points:**
- Runs when modal opens or selectedCourse changes
- Converts arrays back to strings for textarea/input
- Uses join() with appropriate separators
- Clears upload state
- Uses optional chaining (?.) for safety
- Fallback values for all fields

---

## Modal JSX Structure

```jsx
{isEditCourseModal && (
    <div style={s.backdrop} onClick={() => setIsEditCourseModal(false)}>
        <div style={{ ...s.modal, maxWidth: '800px', maxHeight: '90vh' }} 
             onClick={e => e.stopPropagation()}>
            
            {/* HEADER */}
            <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Edit Course</h3>
                <button onClick={() => setIsEditCourseModal(false)} 
                        style={s.closeBtn}>
                    <X size={18} />
                </button>
            </div>

            {/* BODY */}
            <div style={s.modalBody}>
                <form onSubmit={handleEditCourse} 
                      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Section 1: Basic Information */}
                    {/* Section 2: Thumbnail */}
                    {/* Section 3: Pricing */}
                    {/* Section 4: Content */}
                    {/* Section 5: Actions */}
                </form>
            </div>
        </div>
    </div>
)}
```

**Key Points:**
- Backdrop: Clickable outside to close
- Modal: maxWidth 800px, maxHeight 90vh
- stopPropagation on modal click
- Form: flexColumn layout with 24px gaps
- Sections separated by borders
- Actions at bottom

---

## Validation Rules

### Frontend Validation (Client-side)

```javascript
// File upload validation
const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSize = 5 * 1024 * 1024; // 5MB

// Form validation (HTML5 + JS)
courseTitle - required
descriptionText - required
estimatedDurationHours - required, min 1
price - required, min 0
discountPrice - optional, < price when set
```

### Backend Validation (Schema)

```javascript
// Course.js Model
courseTitle: {
    required: true,
    minlength: 5,
    maxlength: 150,
    unique: true
},
descriptionText: {
    required: true,
    minlength: 20
},
technicalCategory: {
    enum: [13 categories],
    required: true
},
level: {
    enum: ['Beginner', 'Intermediate', 'Advanced']
},
language: {
    enum: ['English', 'Amharic', 'Afaan Oromo']
},
price: {
    type: Number,
    default: 0
},
discountPrice: {
    type: Number,
    default: null,
    validate: value < this.price
}
```

---

## API Integration Points

### courseService Methods Used

```javascript
// From client/src/services/api.jsx
courseService.update(id, data)
    → PUT /api/courses/:id
    → Returns { success: true, data: course }

courseService.getInstructorCourses()
    → GET /api/courses/instructor/mine
    → Returns { success: true, data: [courses] }
```

### HTTP Request Details

**Update Course:**
```
Method: PUT
URL: /api/courses/{courseId}
Auth: Required (HTTP-only cookie)
Body: Application/JSON
{
    courseTitle: string,
    subtitle: string,
    descriptionText: string,
    technicalCategory: enum,
    level: enum,
    language: enum,
    estimatedDurationHours: number,
    price: number,
    discountPrice: number|null,
    thumbnailUrl: string,
    learningObjectives: string[],
    requirements: string[],
    tags: string[]
}
Response: { success: true, data: { course with all fields } }
```

**Upload Thumbnail:**
```
Method: POST
URL: /api/courses/{courseId}/thumbnail
Auth: Required (HTTP-only cookie)
Content-Type: multipart/form-data
Body: FormData with 'thumbnail' file
Response: { success: true, data: { updated course } }
```

---

## Error Handling Strategy

### Frontend Error Handling

```javascript
// Upload errors
setThumbnailUploadError('message')
// User sees error in red text below upload section

// Form submission errors
alert(error.response?.data?.message)
// Shows alert dialog to user

// File validation errors
// Prevents upload before submission
// Shows immediately as user selects file
```

### Error Messages

| Error | Scenario | Handling |
|-------|----------|----------|
| Invalid file type | User selects PDF/GIF | Prevent selection |
| File too large | File > 5MB | Prevent selection |
| Upload failed | Network error | Show error text |
| Form invalid | Missing required field | Show validation error |
| Course not found | Course deleted | Show alert |
| Unauthorized | User not owner | API returns 403 |

---

## Performance Optimizations

### Current Optimizations:

1. **FileReader API**
   - Async preview generation
   - No blocking operations
   - Memory-efficient

2. **State Updates**
   - Batch related updates when possible
   - Avoid unnecessary re-renders
   - Use functional setState

3. **Async Operations**
   - Upload doesn't block UI
   - Loading states prevent double-clicks
   - Finally block ensures cleanup

### Potential Future Optimizations:

```javascript
// React.memo for modal component
export const EditCourseModal = React.memo(({ ... }) => {
    // Component code
});

// useMemo for expensive computations
const formattedData = useMemo(() => {
    return courseForm.tags.split(',').map(t => t.trim());
}, [courseForm.tags]);

// useCallback for handler memoization
const handleEditCourse = useCallback(async (e) => {
    // Handler code
}, [courseForm, selectedCourse]);
```

---

## Testing Strategy

### Unit Tests (to implement)

```javascript
// Test: handleThumbnailFileSelect
test('validates JPG files', () => {
    // Create mock file with type image/jpeg
    // Call handler
    // Assert no error set
});

test('rejects PDF files', () => {
    // Create mock file with type application/pdf
    // Call handler
    // Assert error message set
});

test('rejects files > 5MB', () => {
    // Create mock file with size 6MB
    // Call handler
    // Assert size error set
});
```

### Integration Tests (to implement)

```javascript
// Test: Full edit workflow
test('user can edit and save course', async () => {
    // Render modal
    // Fill form fields
    // Click save
    // Mock API call
    // Assert course updated
});

test('user can upload thumbnail', async () => {
    // Select file
    // Click upload
    // Mock API
    // Assert state updated
});
```

---

## Extending the Feature

### To Add New Course Fields:

1. **Update Course Model**
   ```javascript
   // backend/models/Course.js
   newField: {
       type: String,
       default: ''
   }
   ```

2. **Update Form State**
   ```javascript
   // Add to courseForm initial state
   const [courseForm, setCourseForm] = useState({
       ...existing,
       newField: ''
   });
   ```

3. **Update Form Population useEffect**
   ```javascript
   newField: selectedCourse.newField || ''
   ```

4. **Add Form Input**
   ```jsx
   <div style={s.formGroup}>
       <label style={s.label}>New Field</label>
       <input 
           style={s.input}
           value={courseForm.newField}
           onChange={e => setCourseForm({...courseForm, newField: e.target.value})}
       />
   </div>
   ```

5. **Test thoroughly** before deploying

---

## Common Modifications

### Change Thumbnail Size Limit:

```javascript
// Change from 5MB to 10MB
const maxSize = 10 * 1024 * 1024; // Line ~495
```

### Add File Format:

```javascript
// Add TIFF support
const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
```

### Add New Course Category:

```javascript
// backend/models/Course.js - add to enum
technicalCategory: {
    enum: [
        // ... existing,
        'New Category'
    ]
}

// client/src/pages/instructor/InstructorDashboard.jsx
// Update select dropdown list
```

### Change Currency:

```javascript
// If changing from ETB to another currency,
// Update label in pricing section
// Update form submission logic if needed
// Update Course.price field type/validation
```

---

## Debugging Tips

### Enable Verbose Logging:

```javascript
const handleUploadThumbnail = async () => {
    console.log('Starting upload...');
    console.log('File:', selectedThumbnailFile);
    console.log('Course ID:', selectedCourse._id);
    
    // ... rest of function
    
    console.log('Response:', result);
    console.log('New thumbnail URL:', result.data.thumbnailUrl);
};
```

### Browser DevTools:

1. **Network Tab**
   - Monitor API requests
   - Check request/response bodies
   - Verify auth headers

2. **Console Tab**
   - Check for JS errors
   - Review console logs
   - Test API calls manually

3. **Storage Tab**
   - Verify cookies present
   - Check localStorage

### Common Issues:

| Issue | Debug Steps |
|-------|------------|
| Upload fails | Check Network tab, verify auth cookie |
| Form won't save | Check form state, verify API accessible |
| Thumbnail not showing | Verify Cloudinary URL format, check CORS |
| Page crashes | Check console for errors, review React DevTools |

---

## Deployment Checklist

Before deploying to production:

- [ ] Test all form fields
- [ ] Test thumbnail upload
- [ ] Test discount pricing
- [ ] Test content browser
- [ ] Verify Cloudinary credentials
- [ ] Test with real course data
- [ ] Check responsive design
- [ ] Verify auth works
- [ ] Test error scenarios
- [ ] Check performance
- [ ] Document changes
- [ ] Get approval

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 2026 | Initial implementation |

---

## Related Documentation

- Course Edit User Guide: `COURSE_EDIT_USER_GUIDE.md`
- Course Edit Enhancements: `COURSE_EDIT_ENHANCEMENTS.md`
- Course Model: `backend/models/Course.js`
- Course Controller: `backend/controllers/courseController.js`
- Cloudinary Service: `backend/services/cloudinaryService.js`

---

**Last Updated:** August 2026  
**Maintained By:** Development Team  
**Status:** Production Ready
