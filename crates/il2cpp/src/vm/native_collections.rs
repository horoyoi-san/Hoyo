use std::ffi::c_void;
use std::slice;

use crate::vm::class::Il2CppClass;

// Represents IL2CPP's List<T>
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct List<T> {
    class: Il2CppClass,
    monitor: usize,
    items: *const Array<T>,   // Pointer to Il2CppArray<T>
    size: i32,                // Number of elements
    version: i32,             // Modification counter
    sync_root: *const c_void, // ISyncRoot object
}

pub struct ListIter<T: Copy> {
    slice: *const T,
    len: usize,
    index: usize,
}

impl<T: Copy> Iterator for ListIter<T> {
    type Item = T;

    fn next(&mut self) -> Option<Self::Item> {
        if self.index < self.len {
            unsafe {
                let item = *self.slice.add(self.index);
                self.index += 1;
                Some(item)
            }
        } else {
            None
        }
    }
}

impl<T: Copy> IntoIterator for List<T> {
    type Item = T;
    type IntoIter = ListIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        if !self.items.is_null() && self.size >= 0 {
            unsafe {
                let array = &*self.items;
                let slice = slice::from_raw_parts(array.elements.as_ptr(), array.max_length);
                ListIter {
                    slice: slice.as_ptr(),
                    len: self.size as usize,
                    index: 0,
                }
            }
        } else {
            ListIter {
                slice: std::ptr::null(),
                len: 0,
                index: 0,
            }
        }
    }
}

impl<T: Copy> IntoIterator for &List<T> {
    type Item = T;
    type IntoIter = ListIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

impl<T: Copy> List<T> {
    /// Returns the number of elements
    pub fn len(&self) -> usize {
        if self.size >= 0 {
            self.size as usize
        } else {
            0
        }
    }

    /// Returns true if the list is empty
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Safely get element at index, returns None if out of bounds
    pub fn get(&self, index: usize) -> Option<T> {
        if let Some(array) = self.get_array() {
            array.get(index)
        } else {
            None
        }
    }

    /// Returns an iterator over the elements
    pub fn iter(&self) -> ListIter<T> {
        if let Some(array) = self.get_array() {
            unsafe {
                let slice = slice::from_raw_parts(array.elements.as_ptr(), array.max_length);
                ListIter {
                    slice: slice.as_ptr(),
                    len: self.size as usize,
                    index: 0,
                }
            }
        } else {
            ListIter {
                slice: std::ptr::null(),
                len: 0,
                index: 0,
            }
        }
    }

    /// Returns the first element, if any
    pub fn first(&self) -> Option<T> {
        self.get(0)
    }

    /// Returns the last element, if any
    pub fn last(&self) -> Option<T> {
        let len = self.len();
        if len > 0 { self.get(len - 1) } else { None }
    }

    /// Find the first element where the callback returns true
    pub fn find<F>(&self, predicate: F) -> Option<T>
    where
        F: Fn(&T) -> bool,
    {
        self.iter().find(predicate)
    }

    /// Returns true if the list contains the element
    pub fn contains(&self, value: &T) -> bool
    where
        T: PartialEq,
    {
        self.iter().any(|x| x == *value)
    }

    /// Performs a binary search, assuming the list is sorted
    pub fn binary_search(&self, value: &T) -> Result<usize, usize>
    where
        T: Ord,
    {
        let mut low = 0;
        let mut high = self.len();

        while low < high {
            let mid = low + (high - low) / 2;
            match self.get(mid) {
                Some(x) => match x.cmp(value) {
                    std::cmp::Ordering::Equal => return Ok(mid),
                    std::cmp::Ordering::Less => low = mid + 1,
                    std::cmp::Ordering::Greater => high = mid,
                },
                None => break,
            }
        }
        Err(low)
    }

    /// Returns true if the list starts with the given slice
    pub fn starts_with(&self, slice: &[T]) -> bool
    where
        T: PartialEq,
    {
        if slice.len() > self.len() {
            return false;
        }
        self.iter().take(slice.len()).eq(slice.iter().copied())
    }

    /// Returns true if the list ends with the given slice
    pub fn ends_with(&self, slice: &[T]) -> bool
    where
        T: PartialEq,
    {
        if slice.len() > self.len() {
            return false;
        }
        self.iter()
            .skip(self.len() - slice.len())
            .eq(slice.iter().copied())
    }

    /// Internal: Get the underlying Il2CppArray
    fn get_array(&self) -> Option<&Array<T>> {
        if self.items.is_null() || self.size < 0 {
            None
        } else {
            unsafe { Some(&*self.items) }
        }
    }
}

// Represents IL2CPP's T[] (single-dimensional array)
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct Array<T> {
    class: Il2CppClass,
    monitor: usize,
    bounds: *const ArrayBounds, // Null for SZArray
    max_length: usize,          // Array length
    elements: [T; 0],           // Placeholder for inline elements
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct ArrayBounds {
    length: usize,
    lower_bound: i32,
}

pub struct ArrayIter<T: Copy> {
    slice: *const T,
    len: usize,
    index: usize,
}

impl<T: Copy> Iterator for ArrayIter<T> {
    type Item = T;

    fn next(&mut self) -> Option<Self::Item> {
        if self.index < self.len {
            unsafe {
                let item = *self.slice.add(self.index);
                self.index += 1;
                Some(item)
            }
        } else {
            None
        }
    }
}

impl<T: Copy> IntoIterator for Array<T> {
    type Item = T;
    type IntoIter = ArrayIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        unsafe {
            let slice = slice::from_raw_parts(self.elements.as_ptr(), self.max_length);
            ArrayIter {
                slice: slice.as_ptr(),
                len: self.max_length,
                index: 0,
            }
        }
    }
}

impl<T: Copy> IntoIterator for &Array<T> {
    type Item = T;
    type IntoIter = ArrayIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

impl<T: Copy> Array<T> {
    /// Returns the number of elements
    pub fn len(&self) -> usize {
        self.max_length
    }

    /// Returns true if the array is empty
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Safely get element at index, returns None if out of bounds
    pub fn get(&self, index: usize) -> Option<T> {
        if index >= self.max_length {
            None
        } else {
            unsafe {
                let slice = slice::from_raw_parts(self.elements.as_ptr(), self.max_length);
                Some(slice[index])
            }
        }
    }

    /// Returns an iterator over the elements
    pub fn iter(&self) -> ArrayIter<T> {
        unsafe {
            let slice = slice::from_raw_parts(self.elements.as_ptr(), self.max_length);
            ArrayIter {
                slice: slice.as_ptr(),
                len: self.max_length,
                index: 0,
            }
        }
    }

    /// Returns the first element, if any
    pub fn first(&self) -> Option<T> {
        self.get(0)
    }

    /// Returns the last element, if any
    pub fn last(&self) -> Option<T> {
        let len = self.len();
        if len > 0 { self.get(len - 1) } else { None }
    }

    /// Find the first element where the callback returns true
    pub fn find<F>(&self, predicate: F) -> Option<T>
    where
        F: Fn(&T) -> bool,
    {
        self.iter().find(predicate)
    }

    /// Returns true if the array contains the element
    pub fn contains(&self, value: &T) -> bool
    where
        T: PartialEq,
    {
        self.iter().any(|x| x == *value)
    }

    /// Performs a binary search, assuming the array is sorted
    pub fn binary_search(&self, value: &T) -> Result<usize, usize>
    where
        T: Ord,
    {
        let mut low = 0;
        let mut high = self.len();

        while low < high {
            let mid = low + (high - low) / 2;
            match self.get(mid) {
                Some(x) => match x.cmp(value) {
                    std::cmp::Ordering::Equal => return Ok(mid),
                    std::cmp::Ordering::Less => low = mid + 1,
                    std::cmp::Ordering::Greater => high = mid,
                },
                None => break,
            }
        }
        Err(low)
    }

    /// Returns true if the array starts with the given slice
    pub fn starts_with(&self, slice: &[T]) -> bool
    where
        T: PartialEq,
    {
        if slice.len() > self.len() {
            return false;
        }
        self.iter().take(slice.len()).eq(slice.iter().copied())
    }

    /// Returns true if the array ends with the given slice
    pub fn ends_with(&self, slice: &[T]) -> bool
    where
        T: PartialEq,
    {
        if slice.len() > self.len() {
            return false;
        }
        self.iter()
            .skip(self.len() - slice.len())
            .eq(slice.iter().copied())
    }
}

// Represents IL2CPP's Dictionary<K, V>
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct Dictionary<K, V> {
    class: Il2CppClass,
    monitor: usize,
    buckets: *const i32,                          // Array of bucket indices
    entries: *const Array<DictionaryEntry<K, V>>, // Array of entries
    count: i32,                                   // Number of entries
    version: i32,                                 // Modification counter
    free_list: i32,                               // Free list index
    free_count: i32,                              // Number of free entries
    comparer: *const c_void,                      // IEqualityComparer<K>
    keys: *const c_void,                          // KeyCollection
    values: *const c_void,                        // ValueCollection
    sync_root: *const c_void,                     // ISyncRoot object
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct DictionaryEntry<K, V> {
    hash_code: i32, // Hash code of key
    next: i32,      // Next entry in bucket
    key: K,         // Key
    value: V,       // Value
}

pub struct DictIter<K: Copy, V: Copy> {
    entries: *const DictionaryEntry<K, V>,
    len: usize,
    index: usize,
}

impl<K: Copy, V: Copy> Iterator for DictIter<K, V> {
    type Item = (K, V);

    fn next(&mut self) -> Option<Self::Item> {
        if self.index < self.len {
            unsafe {
                let entry = &*self.entries.add(self.index);
                self.index += 1;
                Some((entry.key, entry.value))
            }
        } else {
            None
        }
    }
}

pub struct DictKeysIter<K: Copy, V: Copy> {
    entries: *const DictionaryEntry<K, V>,
    len: usize,
    index: usize,
}

impl<K: Copy, V: Copy> Iterator for DictKeysIter<K, V> {
    type Item = K;

    fn next(&mut self) -> Option<Self::Item> {
        if self.index < self.len {
            unsafe {
                let entry = &*self.entries.add(self.index);
                self.index += 1;
                Some(entry.key)
            }
        } else {
            None
        }
    }
}

pub struct DictValuesIter<K: Copy, V: Copy> {
    entries: *const DictionaryEntry<K, V>,
    len: usize,
    index: usize,
}

impl<K: Copy, V: Copy> Iterator for DictValuesIter<K, V> {
    type Item = V;

    fn next(&mut self) -> Option<Self::Item> {
        if self.index < self.len {
            unsafe {
                let entry = &*self.entries.add(self.index);
                self.index += 1;
                Some(entry.value)
            }
        } else {
            None
        }
    }
}

impl<K: PartialEq + Copy, V: Copy> IntoIterator for Dictionary<K, V> {
    type Item = (K, V);
    type IntoIter = DictIter<K, V>;

    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

impl<K: PartialEq + Copy, V: Copy> IntoIterator for &Dictionary<K, V> {
    type Item = (K, V);
    type IntoIter = DictIter<K, V>;

    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

impl<K: PartialEq + Copy, V: Copy> Dictionary<K, V> {
    /// Returns the number of entries
    pub fn len(&self) -> usize {
        if self.count >= 0 {
            self.count as usize
        } else {
            0
        }
    }

    /// Returns true if the dictionary is empty
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Safely get value by key, returns None if key not found
    pub fn get(&self, key: K) -> Option<V> {
        self.iter().find(|(k, _)| k == &key).map(|(_, v)| v)
    }

    /// Returns true if the key exists
    pub fn contains_key(&self, key: K) -> bool {
        self.iter().any(|(k, _)| k == key)
    }

    /// Returns an iterator over key-value pairs
    pub fn iter(&self) -> DictIter<K, V> {
        if !self.entries.is_null() && self.count > 0 {
            unsafe {
                let array = &*self.entries;
                DictIter {
                    entries: array.elements.as_ptr(),
                    len: self.count as usize,
                    index: 0,
                }
            }
        } else {
            DictIter {
                entries: std::ptr::null(),
                len: 0,
                index: 0,
            }
        }
    }

    /// Returns an iterator over keys
    pub fn keys(&self) -> DictKeysIter<K, V> {
        if !self.entries.is_null() && self.count > 0 {
            unsafe {
                let array = &*self.entries;
                DictKeysIter {
                    entries: array.elements.as_ptr(),
                    len: self.count as usize,
                    index: 0,
                }
            }
        } else {
            DictKeysIter {
                entries: std::ptr::null(),
                len: 0,
                index: 0,
            }
        }
    }

    /// Returns an iterator over values
    pub fn values(&self) -> DictValuesIter<K, V> {
        if !self.entries.is_null() && self.count > 0 {
            unsafe {
                let array = &*self.entries;
                DictValuesIter {
                    entries: array.elements.as_ptr(),
                    len: self.count as usize,
                    index: 0,
                }
            }
        } else {
            DictValuesIter {
                entries: std::ptr::null(),
                len: 0,
                index: 0,
            }
        }
    }

    /// Returns the key-value pair for the given key, if found
    pub fn get_key_value(&self, key: K) -> Option<(K, V)> {
        self.iter().find(|(k, _)| k == &key)
    }

    /// Find the first value where the callback returns true
    pub fn find<F>(&self, predicate: F) -> Option<V>
    where
        F: Fn(&K, &V) -> bool,
    {
        self.iter().find(|(k, v)| predicate(k, v)).map(|(_, v)| v)
    }
}
