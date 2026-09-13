'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const userName = user?.name || 'John Doe';
  const userEmail = user?.email || '';

  // Extract initials for Avatar Fallback (e.g., "John Doe" -> "JD")
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navLinks = [{ href: '/timesheets', label: 'Timesheets' }];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-4 lg:py-3">
        {/* Left Side: Brand Logo & Navigation */}
        <div className="flex items-center space-x-8">
          <Link
            href="/dashboard"
            className="rounded-md text-xl font-bold tracking-tight text-gray-900 focus-visible:ring-2 focus-visible:ring-[#1D61E8] focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            ticktock
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden space-x-6 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Profile Dropdown & Mobile Menu Button */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus-visible:none flex items-center gap-2 rounded-full p-1 pl-1.5 transition focus-visible:outline-none">
                <Avatar className="h-8 w-8 border border-gray-200">
                  {user?.image && <AvatarImage src={user.image} alt={userName} />}
                  <AvatarFallback className="bg-[#1D61E8]/10 text-xs font-semibold text-[#1D61E8]">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <span className="text-sm font-medium text-gray-700">{userName}</span>

                <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm leading-none font-medium text-gray-900">{userName}</p>
                  {userEmail && (
                    <p className="truncate text-xs leading-none text-gray-500">{userEmail}</p>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex w-full cursor-pointer items-center">
                    <UserIcon className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
