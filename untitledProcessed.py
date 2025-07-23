print("welcome to area calculator")
choice = input("Rectangle(1) or square(2) ? ")

if choice == '1':
    length = int(input("Enter length: "))
    breadth = int(input("Enter breadth: "))
    area = length * breadth
    print("The area is:", area)
elif choice == '2':
    side = int(input("Enter side: "))
    area = side * side
    print("The area is:", area)