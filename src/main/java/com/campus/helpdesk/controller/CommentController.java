package com.campus.helpdesk.controller;

import com.campus.helpdesk.model.Comment;
import com.campus.helpdesk.model.Role;
import com.campus.helpdesk.model.Ticket;
import com.campus.helpdesk.model.User;
import com.campus.helpdesk.service.CommentService;
import com.campus.helpdesk.service.TicketService;
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
@RequestMapping("/api/tickets/{ticketId}/comments")
public class CommentController {

    @Autowired
    private CommentService commentService;

    @Autowired
    private TicketService ticketService;

    private User requireCurrentUser(HttpServletRequest request) {
        return SessionHelper.getCurrentUser(request);
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        Map<String, String> error = new HashMap<>();
        error.put("message", "Unauthorized. Please login to access this resource.");
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    @GetMapping
    public ResponseEntity<?> getComments(@PathVariable Long ticketId, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        Ticket ticket = ticketService.getTicketById(ticketId).orElse(null);

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

        List<Comment> comments = commentService.getCommentsForTicket(ticketId);
        return ResponseEntity.ok(comments);
    }

    @PostMapping
    public ResponseEntity<?> addComment(@PathVariable Long ticketId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = requireCurrentUser(request);
        if (user == null) {
            return unauthorized();
        }
        String content = body.get("content");

        if (content == null || content.trim().isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Comment content cannot be empty");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        Ticket ticket = ticketService.getTicketById(ticketId).orElse(null);
        if (ticket == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Ticket not found");
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        if (user.getRole() != Role.AGENT && user.getRole() != Role.ADMIN
                && !ticket.getCreatedBy().getId().equals(user.getId())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Access denied to comment on this ticket");
            return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
        }

        Comment created = commentService.addComment(ticketId, user, content);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }
}
