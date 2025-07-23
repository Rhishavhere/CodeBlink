```python
print("welcome to area calculator")
choice = input("Rectangle(1) or square(2) ? ")

if choice == '1':
    length = float(input("Enter length: "))
    breadth = float(input("Enter breadth: "))
    area = length * breadth
elif choice == '2':
    side = float(input("Enter side: "))
    area = side * side
else:
    area = None
    print("Invalid choice.")

if area is not None:
    print("The area is:", area)
```