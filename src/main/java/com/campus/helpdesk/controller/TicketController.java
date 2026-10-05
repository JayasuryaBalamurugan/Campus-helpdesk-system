package com.campus.helpdesk.controller;

import com.campus.helpdesk.model.*;
import com.campus.helpdesk.service.TicketService;
import com.campus.helpdesk.service.UserService;
import com.campus.helpdesk.util.SessionHelper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @Autowired
    private UserService userService;

    private User requireCurrentUser(HttpServletRequest request) {
        return SessionHelper.getCurrentUser(request);
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        Map<String, String> error = new HashMap<>();
        error.put("message", "Unauthorized. Please login to access this resource.");
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    @GetMapping
    public ResponseEntity<?> getTickets(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        List<Ticket> tickets = ticketService.getTicketsForUser(user);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        Map<String, Long> stats = ticketService.getDashboardStats(user);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/agents")
    public ResponseEntity<?> getAgents(HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        if (user.getRole() != Role.AGENT && user.getRole() != Role.ADMIN) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Only support staff can view agent listings");
            return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }
        List<User> agents = userService.getAllAgents();
        return ResponseEntity.ok(agents);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTicketById(@PathVariable Long id, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        Ticket ticket = ticketService.getTicketById(id).orElse(null);

        if (ticket == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ticket not found");
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        if (user.getRole() != Role.AGENT && user.getRole() != Role.ADMIN
                && !ticket.getCreatedBy().getId().equals(user.getId())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Access denied");
            return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }

        return ResponseEntity.ok(ticket);
    }

    @PostMapping
    public ResponseEntity<?> createTicket(@RequestBody Ticket ticket, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        if (ticket.getTitle() == null || ticket.getTitle().trim().isEmpty()
                || ticket.getDescription() == null || ticket.getDescription().trim().isEmpty()
                || ticket.getCategory() == null || ticket.getCategory().trim().isEmpty()) {

            Map<String, String> error = new HashMap<>();
            error.put("message", "Title, description, and category are required");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        Ticket created = ticketService.createTicket(ticket, user);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        String statusStr = body.get("status");

        if (statusStr == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Status value is required");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        try {
            Status status = Status.valueOf(statusStr.toUpperCase());
            Ticket ticket = ticketService.getTicketById(id).orElse(null);

            if (ticket == null) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Ticket not found");
                return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
            }

            boolean isAgent = user.getRole() == Role.AGENT || user.getRole() == Role.ADMIN;
            boolean isCreator = ticket.getCreatedBy().getId().equals(user.getId());

            if (!isAgent && (!isCreator || status != Status.CLOSED)) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "You are not authorized to set this ticket status");
                return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
            }

            Ticket updated = ticketService.updateTicketStatus(id, status);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid status value");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }
    }

    @PatchMapping("/{id}/priority")
    public ResponseEntity<?> updatePriority(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        String priorityStr = body.get("priority");

        if (user.getRole() != Role.AGENT && user.getRole() != Role.ADMIN) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Only agents or admins can update ticket priority");
            return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }

        if (priorityStr == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Priority value is required");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        try {
            Priority priority = Priority.valueOf(priorityStr.toUpperCase());
            Ticket updated = ticketService.updateTicketPriority(id, priority);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid priority value");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<?> assignTicket(@PathVariable Long id, @RequestBody Map<String, Long> body, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }

        if (user.getRole() != Role.AGENT && user.getRole() != Role.ADMIN) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Only agents or admins can assign tickets");
            return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }

        Long agentId = body.get("agentId");
        try {
            Ticket updated = ticketService.assignTicket(id, agentId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }
    }
}
